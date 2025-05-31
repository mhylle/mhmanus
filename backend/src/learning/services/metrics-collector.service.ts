import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { LearningMetric } from '../entities/learning-metric.entity';
import { ExecutionMetrics, ToolUsageMetric } from '../interfaces/learning.interface';

@Injectable()
export class MetricsCollectorService {
  private readonly logger = new Logger(MetricsCollectorService.name);
  private activeMetrics: Map<string, Partial<ExecutionMetrics>> = new Map();

  constructor(
    @InjectRepository(LearningMetric)
    private readonly metricsRepository: Repository<LearningMetric>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async startMetricCollection(agentId: string, taskId: string): Promise<void> {
    const key = `${agentId}:${taskId}`;
    this.activeMetrics.set(key, {
      agentId,
      taskId,
      executionTime: Date.now(),
      memoryUsage: process.memoryUsage().heapUsed,
      toolsUsed: [],
      errorCount: 0,
      success: false,
    });

    this.logger.debug(`Started metric collection for ${key}`);
  }

  async recordToolUsage(
    agentId: string,
    taskId: string,
    toolUsage: ToolUsageMetric,
  ): Promise<void> {
    const key = `${agentId}:${taskId}`;
    const metrics = this.activeMetrics.get(key);
    
    if (!metrics) {
      this.logger.warn(`No active metrics for ${key}`);
      return;
    }

    metrics.toolsUsed = metrics.toolsUsed || [];
    metrics.toolsUsed.push(toolUsage);

    if (!toolUsage.success) {
      metrics.errorCount = (metrics.errorCount || 0) + 1;
    }

    this.logger.debug(`Recorded tool usage for ${key}: ${toolUsage.toolName}`);
  }

  async finishMetricCollection(
    agentId: string,
    taskId: string,
    success: boolean,
    outputQuality?: number,
  ): Promise<ExecutionMetrics> {
    const key = `${agentId}:${taskId}`;
    const metrics = this.activeMetrics.get(key);
    
    if (!metrics) {
      throw new Error(`No active metrics found for ${key}`);
    }

    // Calculate final metrics
    const finalMetrics: ExecutionMetrics = {
      agentId: metrics.agentId!,
      taskId: metrics.taskId!,
      executionTime: Date.now() - metrics.executionTime!,
      memoryUsage: process.memoryUsage().heapUsed - metrics.memoryUsage!,
      toolsUsed: metrics.toolsUsed || [],
      success,
      errorCount: metrics.errorCount || 0,
      outputQuality,
    };

    // Save to database
    const savedMetric = await this.metricsRepository.save(finalMetrics);

    // Emit event for pattern recognition
    this.eventEmitter.emit('metrics.collected', savedMetric);

    // Clean up
    this.activeMetrics.delete(key);

    this.logger.log(`Completed metric collection for ${key}`);
    return savedMetric;
  }

  async getMetricsByAgent(
    agentId: string,
    limit: number = 100,
  ): Promise<LearningMetric[]> {
    return this.metricsRepository.find({
      where: { agentId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getMetricsByTask(taskId: string): Promise<LearningMetric[]> {
    return this.metricsRepository.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAverageMetrics(
    agentId: string,
    taskType?: string,
  ): Promise<{
    avgExecutionTime: number;
    avgMemoryUsage: number;
    successRate: number;
    avgToolCalls: number;
    avgErrorCount: number;
  }> {
    const query = this.metricsRepository
      .createQueryBuilder('metric')
      .where('metric.agentId = :agentId', { agentId });

    if (taskType) {
      query.andWhere('metric.context->>\'taskType\' = :taskType', { taskType });
    }

    const result = await query
      .select('COUNT(*)', 'total')
      .addSelect('AVG(metric.executionTime)', 'avgExecutionTime')
      .addSelect('AVG(metric.memoryUsage)', 'avgMemoryUsage')
      .addSelect('SUM(CASE WHEN metric.success = true THEN 1 ELSE 0 END)', 'successCount')
      .addSelect('AVG(jsonb_array_length(metric.toolsUsed))', 'avgToolCalls')
      .addSelect('AVG(metric.errorCount)', 'avgErrorCount')
      .getRawOne();

    return {
      avgExecutionTime: parseFloat(result.avgExecutionTime) || 0,
      avgMemoryUsage: parseFloat(result.avgMemoryUsage) || 0,
      successRate: result.total > 0 ? parseFloat(result.successCount) / parseFloat(result.total) : 0,
      avgToolCalls: parseFloat(result.avgToolCalls) || 0,
      avgErrorCount: parseFloat(result.avgErrorCount) || 0,
    };
  }

  @OnEvent('agent.execution.start')
  async handleExecutionStart(payload: { agentId: string; taskId: string }) {
    await this.startMetricCollection(payload.agentId, payload.taskId);
  }

  @OnEvent('agent.tool.used')
  async handleToolUsage(payload: {
    agentId: string;
    taskId: string;
    tool: ToolUsageMetric;
  }) {
    await this.recordToolUsage(payload.agentId, payload.taskId, payload.tool);
  }

  @OnEvent('agent.execution.complete')
  async handleExecutionComplete(payload: {
    agentId: string;
    taskId: string;
    success: boolean;
    quality?: number;
  }) {
    await this.finishMetricCollection(
      payload.agentId,
      payload.taskId,
      payload.success,
      payload.quality,
    );
  }
}