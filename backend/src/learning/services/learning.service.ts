import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricsCollectorService } from './metrics-collector.service';
import { PatternRecognitionService } from './pattern-recognition.service';
import { AdaptationService } from './adaptation.service';
import { ExecutionPattern } from '../entities/execution-pattern.entity';
import { LearningMetric } from '../entities/learning-metric.entity';
import { AgentStrategy } from '../entities/agent-strategy.entity';
import {
  LearningConfig,
  LearningInsight,
  PerformanceComparison,
  Pattern,
  AdaptationStrategy,
} from '../interfaces/learning.interface';
import { AgentContext, AgentType } from '../../agents/interfaces/agent.interface';

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);
  private readonly config: LearningConfig = {
    minPatternOccurrences: 3,
    confidenceThreshold: 0.7,
    maxPatternAge: 30, // days
    adaptationRate: 0.1,
  };

  constructor(
    @InjectRepository(ExecutionPattern)
    private readonly patternRepository: Repository<ExecutionPattern>,
    @InjectRepository(LearningMetric)
    private readonly metricsRepository: Repository<LearningMetric>,
    @InjectRepository(AgentStrategy)
    private readonly strategyRepository: Repository<AgentStrategy>,
    private readonly metricsCollector: MetricsCollectorService,
    private readonly patternRecognition: PatternRecognitionService,
    private readonly adaptation: AdaptationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async startLearning(agentId: string, taskId: string): Promise<void> {
    await this.metricsCollector.startMetricCollection(agentId, taskId);
    
    // Emit event for other services
    this.eventEmitter.emit('learning.started', { agentId, taskId });
  }

  async getAdaptations(
    agentType: AgentType,
    context: AgentContext,
  ): Promise<Record<string, any>> {
    const strategies = await this.adaptation.getAdaptationStrategies(
      agentType,
      context,
    );

    if (strategies.length === 0) {
      return {};
    }

    // Apply the highest priority strategy
    const strategy = strategies[0];
    const adaptations = await this.adaptation.applyStrategy(strategy, context);

    // Track strategy usage
    context.sharedMemory.set('appliedStrategyId', strategy.id);

    return adaptations;
  }

  async recordSuccess(
    agentId: string,
    taskId: string,
    success: boolean,
    quality?: number,
  ): Promise<void> {
    const metrics = await this.metricsCollector.finishMetricCollection(
      agentId,
      taskId,
      success,
      quality,
    );

    // Update strategy success if one was applied
    const strategyId = metrics.context?.appliedStrategyId;
    if (strategyId) {
      await this.adaptation.updateStrategySuccess(strategyId, success);
    }

    // Emit completion event
    this.eventEmitter.emit('learning.completed', {
      agentId,
      taskId,
      success,
      metrics,
    });
  }

  async getRelevantPatterns(
    taskType: string,
    agentType?: AgentType,
  ): Promise<Pattern[]> {
    const patterns = await this.patternRecognition.getRelevantPatterns(
      taskType,
      this.config.confidenceThreshold,
    );

    // Filter out stale patterns
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxPatternAge);

    return patterns.filter(p => p.lastUsed > cutoffDate);
  }

  async generateInsights(agentId: string): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    
    // Get agent metrics
    const metrics = await this.metricsCollector.getMetricsByAgent(agentId, 100);
    const avgMetrics = await this.metricsCollector.getAverageMetrics(agentId);

    // Insight 1: Tool usage patterns
    const toolUsageMap = new Map<string, number>();
    metrics.forEach(m => {
      m.toolsUsed.forEach(tool => {
        toolUsageMap.set(tool.toolName, (toolUsageMap.get(tool.toolName) || 0) + 1);
      });
    });

    const mostUsedTools = Array.from(toolUsageMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (mostUsedTools.length > 0) {
      insights.push({
        patternId: 'tool-usage',
        insight: `Agent frequently uses: ${mostUsedTools.map(t => t[0]).join(', ')}`,
        confidence: 0.9,
        recommendations: [
          'Consider optimizing these tools for better performance',
          'Ensure these tools have proper error handling',
        ],
        createdAt: new Date(),
      });
    }

    // Insight 2: Performance trends
    if (avgMetrics.successRate < 0.7) {
      insights.push({
        patternId: 'low-success-rate',
        insight: `Success rate is ${(avgMetrics.successRate * 100).toFixed(1)}%, below optimal threshold`,
        confidence: 1.0,
        recommendations: [
          'Review failed executions for common patterns',
          'Consider additional training or strategy adjustments',
          'Check if error handling can be improved',
        ],
        createdAt: new Date(),
      });
    }

    // Insight 3: Execution time
    if (avgMetrics.avgExecutionTime > 30000) { // 30 seconds
      insights.push({
        patternId: 'slow-execution',
        insight: `Average execution time is ${(avgMetrics.avgExecutionTime / 1000).toFixed(1)}s`,
        confidence: 0.8,
        recommendations: [
          'Consider parallel execution of independent tasks',
          'Review tool selection for more efficient alternatives',
          'Implement caching for repeated operations',
        ],
        createdAt: new Date(),
      });
    }

    return insights;
  }

  async comparePerformance(
    agentId: string,
    taskType: string,
    beforeDate: Date,
  ): Promise<PerformanceComparison> {
    const beforeMetrics = await this.metricsCollector.getAverageMetrics(
      agentId,
      taskType,
    );

    // TODO: Implement proper before/after comparison with date filtering
    const afterMetrics = beforeMetrics; // Placeholder

    const improvement = this.calculateImprovement(beforeMetrics, afterMetrics);

    return {
      agentId,
      taskType,
      beforeLearning: {
        avgExecutionTime: beforeMetrics.avgExecutionTime,
        successRate: beforeMetrics.successRate,
        avgMemoryUsage: beforeMetrics.avgMemoryUsage,
        avgToolCalls: beforeMetrics.avgToolCalls,
        errorRate: beforeMetrics.avgErrorCount,
      },
      afterLearning: {
        avgExecutionTime: afterMetrics.avgExecutionTime,
        successRate: afterMetrics.successRate,
        avgMemoryUsage: afterMetrics.avgMemoryUsage,
        avgToolCalls: afterMetrics.avgToolCalls,
        errorRate: afterMetrics.avgErrorCount,
      },
      improvement,
    };
  }

  private calculateImprovement(
    before: any,
    after: any,
  ): number {
    // Calculate weighted improvement score
    const timeImprovement = (before.avgExecutionTime - after.avgExecutionTime) / before.avgExecutionTime;
    const successImprovement = after.successRate - before.successRate;
    const errorImprovement = (before.avgErrorCount - after.avgErrorCount) / Math.max(before.avgErrorCount, 1);

    // Weighted average
    return (timeImprovement * 0.3 + successImprovement * 0.5 + errorImprovement * 0.2) * 100;
  }

  async enableLearningMode(agentId: string, enabled: boolean): Promise<void> {
    // Store learning mode preference
    this.eventEmitter.emit('learning.mode.changed', { agentId, enabled });
    this.logger.log(`Learning mode ${enabled ? 'enabled' : 'disabled'} for agent ${agentId}`);
  }

  async getTopStrategies(
    agentType: AgentType,
    limit: number = 5,
  ): Promise<AdaptationStrategy[]> {
    return this.strategyRepository.find({
      where: { agentType, enabled: true },
      order: { successRate: 'DESC', applicationCount: 'DESC' },
      take: limit,
    });
  }
}