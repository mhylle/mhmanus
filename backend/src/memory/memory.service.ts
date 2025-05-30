import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  IMemoryService,
  IShortTermMemory,
  ILongTermMemory,
  ISemanticMemory,
  IEpisodicMemory,
  MemoryStats,
  TaskMemory,
  Episode,
} from './interfaces/memory.interface';
import { AgentContext } from '../agents/interfaces/agent.interface';
import { ShortTermMemoryService } from './services/short-term-memory.service';
import { LongTermMemoryService } from './services/long-term-memory.service';
import { SemanticMemoryService } from './services/semantic-memory.service';
import { EpisodicMemoryService } from './services/episodic-memory.service';

@Injectable()
export class MemoryService implements IMemoryService, OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    public readonly shortTerm: ShortTermMemoryService,
    public readonly longTerm: LongTermMemoryService,
    public readonly semantic: SemanticMemoryService,
    public readonly episodic: EpisodicMemoryService,
  ) {}

  async onModuleInit() {
    this.logger.log('Memory service initialized with all layers');
    await this.performHealthCheck();
  }

  // Unified memory operations
  async rememberTask(
    task: any,
    result: any,
    context: AgentContext,
  ): Promise<void> {
    const taskMemory: TaskMemory = {
      taskId: task.id,
      title: task.title,
      description: task.description,
      agentId: context.parentAgentId || 'unknown',
      plan: result.plan || {},
      result: result.output,
      success: result.success,
      tokensUsed: result.tokensUsed || 0,
      duration: result.duration || 0,
      timestamp: new Date(),
    };

    // Store in long-term memory
    await this.longTerm.storeTaskResult(task.id, taskMemory);

    // Create and store episode
    const episode: Episode = {
      id: '',
      taskId: task.id,
      agentId: context.parentAgentId || 'unknown',
      taskType: this.classifyTaskType(task),
      startTime: context.trace.startTime,
      endTime: new Date(),
      success: result.success,
      steps: this.extractStepsFromTrace(context.trace),
      decisions: context.decisions || [],
      outcome: result.output,
      learnings: this.extractLearnings(result),
    };

    await this.episodic.storeEpisode(episode);

    // Store semantic embedding for future similarity search
    const taskDescription = `${task.title}: ${task.description}. Result: ${
      result.success ? 'Success' : 'Failed'
    }`;
    await this.semantic.storeEmbedding(taskDescription, {
      type: 'task',
      source: 'task_completion',
      agentId: context.parentAgentId,
      taskId: task.id,
      timestamp: new Date(),
    });

    this.logger.log(`Remembered task ${task.id} across all memory layers`);
  }

  async recallSimilarTasks(
    task: any,
    limit: number = 5,
  ): Promise<{
    similar: TaskMemory[];
    episodes: Episode[];
    patterns: any[];
  }> {
    // Search semantic memory for similar tasks
    const taskDescription = `${task.title} ${task.description}`;
    const semanticResults = await this.semantic.searchSimilar(
      taskDescription,
      limit,
    );

    // Get task memories for similar tasks
    const taskIds = semanticResults
      .filter((r) => r.metadata.taskId)
      .map((r) => r.metadata.taskId!);

    const similar: TaskMemory[] = [];
    for (const taskId of taskIds) {
      const memories = await this.longTerm.getTaskHistory({
        taskType: taskId,
        limit: 1,
      });
      if (memories.length > 0) {
        similar.push(memories[0]);
      }
    }

    // Get similar episodes
    const episodes = await this.episodic.findSimilarEpisodes(task, limit);

    // Get relevant patterns
    const patterns = await this.longTerm.getPatterns();
    const relevantPatterns = patterns
      .filter(
        (p) =>
          taskDescription.toLowerCase().includes(p.pattern.toLowerCase()) ||
          p.pattern.toLowerCase().includes(taskDescription.toLowerCase()),
      )
      .slice(0, 3);

    return { similar, episodes, patterns: relevantPatterns };
  }

  async getAgentMemory(agentId: string): Promise<{
    context: AgentContext | null;
    recentTasks: TaskMemory[];
    patterns: any[];
  }> {
    const context = await this.shortTerm.getContext(agentId);
    const recentTasks = await this.longTerm.getTaskHistory({
      agentId,
      limit: 10,
    });
    const patterns = await this.longTerm.getPatterns();

    return { context, recentTasks, patterns };
  }

  async getMemoryStats(): Promise<MemoryStats> {
    const stmStats = await this.shortTerm.getMemoryStats();
    const embeddingStats = await this.semantic.getEmbeddingStats();
    const episodeStats = await this.episodic.getEpisodeStats();

    // Get long-term stats
    const totalTasks = await this.longTerm.getTaskHistory();
    const patterns = await this.longTerm.getPatterns();
    const snippets = await this.longTerm.searchCodeSnippets('');

    return {
      shortTerm: {
        activeContexts: stmStats.contextCount,
        recentInteractions: stmStats.interactionCount,
        memoryUsage: 0, // Parse from Redis info if needed
      },
      longTerm: {
        totalTasks: totalTasks.length,
        patterns: patterns.length,
        codeSnippets: snippets.length,
      },
      semantic: {
        totalEmbeddings: embeddingStats.total,
        vectorDimensions: 1536,
      },
      episodic: {
        totalEpisodes: episodeStats.total,
        successRate: episodeStats.successful / episodeStats.total,
      },
    };
  }

  // Learning and pattern extraction
  async learnFromSuccess(taskId: string): Promise<void> {
    const taskHistory = await this.longTerm.getTaskHistory({ limit: 1 });
    if (taskHistory.length === 0) return;

    const task = taskHistory[0];
    if (!task.success) return;

    // Extract and store patterns
    const pattern = {
      id: '',
      type: 'task_decomposition' as const,
      pattern: this.extractPatternFromTask(task),
      description: `Successful pattern for ${task.title}`,
      examples: [taskId],
      successRate: 1.0,
      usageCount: 1,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    await this.longTerm.storePattern(pattern);
    this.logger.log(`Learned new pattern from successful task ${taskId}`);
  }

  // Utility methods
  private classifyTaskType(task: any): string {
    const title = task.title.toLowerCase();
    if (title.includes('api') || title.includes('endpoint'))
      return 'api_development';
    if (title.includes('test')) return 'testing';
    if (title.includes('fix') || title.includes('bug')) return 'bug_fix';
    if (title.includes('refactor')) return 'refactoring';
    if (title.includes('implement') || title.includes('create'))
      return 'feature_development';
    return 'general';
  }

  private extractStepsFromTrace(trace: any): any[] {
    if (!trace.spans) return [];

    return trace.spans.map((span: any, index: number) => ({
      order: index + 1,
      action: span.operation,
      input: span.attributes,
      output:
        span.events.find((e: any) => e.name.includes('completed'))
          ?.attributes || {},
      duration: span.endTime
        ? new Date(span.endTime).getTime() - new Date(span.startTime).getTime()
        : 0,
      success: !span.events.find((e: any) => e.name.includes('failed')),
    }));
  }

  private extractLearnings(result: any): string[] {
    const learnings: string[] = [];

    if (result.reasoning) {
      learnings.push(`Approach: ${result.reasoning}`);
    }

    if (result.subResults && result.subResults.length > 0) {
      const successfulSteps = result.subResults.filter(
        (r: any) => r.success,
      ).length;
      learnings.push(
        `${successfulSteps}/${result.subResults.length} sub-tasks succeeded`,
      );
    }

    return learnings;
  }

  private extractPatternFromTask(task: TaskMemory): string {
    const stepCount = task.plan?.steps?.length || 0;
    return `${task.title} -> ${stepCount} steps, ${task.duration}ms`;
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check Redis connection
      await this.shortTerm.exists('health_check');
      this.logger.log('Short-term memory (Redis) is healthy');

      // Check PostgreSQL connection
      const stats = await this.getMemoryStats();
      this.logger.log('Long-term memory (PostgreSQL) is healthy');
      this.logger.log(`Memory stats: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error('Memory health check failed', error);
    }
  }
}
