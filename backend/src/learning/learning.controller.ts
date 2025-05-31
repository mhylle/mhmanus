import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LearningService } from './services/learning.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { PatternRecognitionService } from './services/pattern-recognition.service';
import { AdaptationService } from './services/adaptation.service';
import { AgentType } from '../agents/interfaces/agent.interface';
import {
  StrategyCondition,
  StrategyAction,
} from './interfaces/learning.interface';

@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(
    private readonly learningService: LearningService,
    private readonly metricsCollector: MetricsCollectorService,
    private readonly patternRecognition: PatternRecognitionService,
    private readonly adaptationService: AdaptationService,
  ) {}

  @Get('metrics/:agentId')
  @ApiOperation({ summary: 'Get learning metrics for an agent' })
  @ApiResponse({ status: 200, description: 'Agent metrics retrieved' })
  async getAgentMetrics(
    @Param('agentId') agentId: string,
    @Query('limit') limit?: number,
  ) {
    const metrics = await this.metricsCollector.getMetricsByAgent(
      agentId,
      limit || 50,
    );
    const avgMetrics = await this.metricsCollector.getAverageMetrics(agentId);

    return {
      agentId,
      metrics,
      averages: avgMetrics,
    };
  }

  @Get('patterns/:taskType')
  @ApiOperation({ summary: 'Get relevant patterns for a task type' })
  @ApiResponse({ status: 200, description: 'Patterns retrieved' })
  async getPatterns(
    @Param('taskType') taskType: string,
    @Query('minSuccessRate') minSuccessRate?: number,
  ) {
    const patterns = await this.patternRecognition.getRelevantPatterns(
      taskType,
      minSuccessRate || 0.7,
    );

    return {
      taskType,
      patterns,
      count: patterns.length,
    };
  }

  @Get('insights/:agentId')
  @ApiOperation({ summary: 'Generate learning insights for an agent' })
  @ApiResponse({ status: 200, description: 'Insights generated' })
  async getInsights(@Param('agentId') agentId: string) {
    const insights = await this.learningService.generateInsights(agentId);

    return {
      agentId,
      insights,
      generatedAt: new Date(),
    };
  }

  @Get('strategies/:agentType')
  @ApiOperation({ summary: 'Get adaptation strategies for an agent type' })
  @ApiResponse({ status: 200, description: 'Strategies retrieved' })
  async getStrategies(
    @Param('agentType') agentType: AgentType,
    @Query('limit') limit?: number,
  ) {
    const strategies = await this.learningService.getTopStrategies(
      agentType,
      limit || 10,
    );

    return {
      agentType,
      strategies,
      count: strategies.length,
    };
  }

  @Post('strategies')
  @ApiOperation({ summary: 'Create a new adaptation strategy' })
  @ApiResponse({ status: 201, description: 'Strategy created' })
  async createStrategy(
    @Body() body: {
      agentType: string;
      taskType: string;
      conditions: StrategyCondition[];
      actions: StrategyAction[];
      priority?: number;
    },
  ) {
    const strategy = await this.adaptationService.createStrategy(
      body.agentType,
      body.taskType,
      body.conditions,
      body.actions,
      body.priority || 0,
    );

    return {
      success: true,
      strategy,
    };
  }

  @Put('learning-mode/:agentId')
  @ApiOperation({ summary: 'Enable or disable learning for an agent' })
  @ApiResponse({ status: 200, description: 'Learning mode updated' })
  async setLearningMode(
    @Param('agentId') agentId: string,
    @Body() body: { enabled: boolean },
  ) {
    await this.learningService.enableLearningMode(agentId, body.enabled);

    return {
      agentId,
      learningEnabled: body.enabled,
    };
  }

  @Get('performance/:agentId')
  @ApiOperation({ summary: 'Compare agent performance before and after learning' })
  @ApiResponse({ status: 200, description: 'Performance comparison' })
  async getPerformanceComparison(
    @Param('agentId') agentId: string,
    @Query('taskType') taskType: string,
    @Query('beforeDate') beforeDate?: string,
  ) {
    const date = beforeDate ? new Date(beforeDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const comparison = await this.learningService.comparePerformance(
      agentId,
      taskType,
      date,
    );

    return comparison;
  }

  @Post('test/generate-metrics')
  @ApiOperation({ summary: 'Generate test metrics for learning system' })
  @ApiResponse({ status: 201, description: 'Test metrics generated' })
  async generateTestMetrics() {
    const agentId = 'test-agent-001';
    const taskTypes = ['code_generation', 'data_analysis', 'testing'];
    const tools = [
      { name: 'read_file', category: 'file' },
      { name: 'write_file', category: 'file' },
      { name: 'search_files', category: 'search' },
      { name: 'create_directory', category: 'file' },
    ];

    const generatedMetrics: any[] = [];

    // Generate 20 test metrics
    for (let i = 0; i < 20; i++) {
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      const taskId = `test-task-${Date.now()}-${i}`;
      
      // Start metric collection
      await this.metricsCollector.startMetricCollection(agentId, taskId);

      // Simulate tool usage
      const numTools = Math.floor(Math.random() * 4) + 2;
      for (let j = 0; j < numTools; j++) {
        const tool = tools[Math.floor(Math.random() * tools.length)];
        await this.metricsCollector.recordToolUsage(agentId, taskId, {
          toolName: tool.name,
          category: tool.category,
          executionTime: Math.random() * 1000 + 100,
          success: Math.random() > 0.1,
          inputSize: Math.floor(Math.random() * 10000),
          outputSize: Math.floor(Math.random() * 50000),
        });
      }

      // Finish with random success
      const success = Math.random() > 0.2;
      const quality = success ? Math.random() * 0.5 + 0.5 : Math.random() * 0.5;
      
      const metric = await this.metricsCollector.finishMetricCollection(
        agentId,
        taskId,
        success,
        quality,
      );

      // Add context
      (metric as any).context = { taskType };
      generatedMetrics.push(metric);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: true,
      message: 'Test metrics generated',
      count: generatedMetrics.length,
      agentId,
    };
  }
}