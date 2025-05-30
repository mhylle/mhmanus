import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThan, LessThan, Between } from 'typeorm';
import {
  ILongTermMemory,
  TaskMemory,
  TaskFilter,
  LearnedPattern,
  CodeSnippet,
} from '../interfaces/memory.interface';
import {
  TaskMemoryEntity,
  LearnedPatternEntity,
  CodeSnippetEntity,
} from '../entities/task-memory.entity';

@Injectable()
export class LongTermMemoryService implements ILongTermMemory {
  private readonly logger = new Logger(LongTermMemoryService.name);

  constructor(
    @InjectRepository(TaskMemoryEntity)
    private taskMemoryRepo: Repository<TaskMemoryEntity>,
    @InjectRepository(LearnedPatternEntity)
    private patternRepo: Repository<LearnedPatternEntity>,
    @InjectRepository(CodeSnippetEntity)
    private codeSnippetRepo: Repository<CodeSnippetEntity>,
  ) {}

  // Generic memory operations
  async store(key: string, value: any): Promise<void> {
    // For long-term memory, we use specific methods instead
    throw new Error('Use specific storage methods for long-term memory');
  }

  async retrieve(key: string): Promise<any | null> {
    // For long-term memory, we use specific retrieval methods
    throw new Error('Use specific retrieval methods for long-term memory');
  }

  async delete(key: string): Promise<void> {
    // Implement based on key pattern
    if (key.startsWith('task:')) {
      await this.taskMemoryRepo.delete({ taskId: key.replace('task:', '') });
    } else if (key.startsWith('pattern:')) {
      await this.patternRepo.delete(key.replace('pattern:', ''));
    } else if (key.startsWith('snippet:')) {
      await this.codeSnippetRepo.delete(key.replace('snippet:', ''));
    }
  }

  async exists(key: string): Promise<boolean> {
    if (key.startsWith('task:')) {
      const count = await this.taskMemoryRepo.count({
        where: { taskId: key.replace('task:', '') },
      });
      return count > 0;
    }
    return false;
  }

  async clear(): Promise<void> {
    // Clear all long-term memory tables
    await this.taskMemoryRepo.clear();
    await this.patternRepo.clear();
    await this.codeSnippetRepo.clear();
    this.logger.warn('Cleared all long-term memory');
  }

  // Task memory management
  async storeTaskResult(taskId: string, result: TaskMemory): Promise<void> {
    const entity = this.taskMemoryRepo.create({
      ...result,
      taskId,
    });

    await this.taskMemoryRepo.save(entity);
    this.logger.log(`Stored task result for ${taskId}`);

    // Extract patterns if successful
    if (result.success) {
      await this.extractAndStorePatterns(result);
    }
  }

  async getTaskHistory(filter?: TaskFilter): Promise<TaskMemory[]> {
    const query = this.taskMemoryRepo.createQueryBuilder('task');

    if (filter) {
      if (filter.agentId) {
        query.andWhere('task.agentId = :agentId', { agentId: filter.agentId });
      }
      if (filter.success !== undefined) {
        query.andWhere('task.success = :success', { success: filter.success });
      }
      if (filter.startDate) {
        query.andWhere('task.timestamp >= :startDate', {
          startDate: filter.startDate,
        });
      }
      if (filter.endDate) {
        query.andWhere('task.timestamp <= :endDate', {
          endDate: filter.endDate,
        });
      }
      if (filter.taskType) {
        query.andWhere('task.title LIKE :taskType', {
          taskType: `%${filter.taskType}%`,
        });
      }
    }

    query.orderBy('task.timestamp', 'DESC');

    if (filter?.limit) {
      query.limit(filter.limit);
    }

    const entities = await query.getMany();
    return entities.map(this.mapTaskMemoryFromEntity);
  }

  // Pattern management
  async storePattern(pattern: LearnedPattern): Promise<void> {
    const existing = await this.patternRepo.findOne({
      where: { pattern: pattern.pattern, type: pattern.type },
    });

    if (existing) {
      // Update existing pattern
      existing.usageCount++;
      existing.lastUsed = new Date();
      existing.examples = [
        ...new Set([...existing.examples, ...pattern.examples]),
      ];
      existing.successRate = (existing.successRate + pattern.successRate) / 2;
      await this.patternRepo.save(existing);
    } else {
      // Create new pattern
      const entity = this.patternRepo.create(pattern);
      await this.patternRepo.save(entity);
    }

    this.logger.log(`Stored pattern of type: ${pattern.type}`);
  }

  async getPatterns(type?: string): Promise<LearnedPattern[]> {
    const where = type ? { type } : {};
    const patterns = await this.patternRepo.find({
      where,
      order: { successRate: 'DESC', usageCount: 'DESC' },
    });

    return patterns.map(this.mapPatternFromEntity);
  }

  // Code snippet management
  async storeCodeSnippet(snippet: CodeSnippet): Promise<void> {
    const entity = this.codeSnippetRepo.create(snippet);
    await this.codeSnippetRepo.save(entity);
    this.logger.log(`Stored code snippet: ${snippet.purpose}`);
  }

  async searchCodeSnippets(query: string): Promise<CodeSnippet[]> {
    const snippets = await this.codeSnippetRepo
      .createQueryBuilder('snippet')
      .where('snippet.purpose ILIKE :query', { query: `%${query}%` })
      .orWhere('snippet.code ILIKE :query', { query: `%${query}%` })
      .orWhere(':tag = ANY(snippet.tags)', { tag: query })
      .orderBy('snippet.usageCount', 'DESC')
      .limit(10)
      .getMany();

    return snippets.map(this.mapCodeSnippetFromEntity);
  }

  // Utility methods
  private async extractAndStorePatterns(taskMemory: TaskMemory): Promise<void> {
    // Simple pattern extraction - in real implementation, use ML
    if (taskMemory.plan && taskMemory.result) {
      const pattern: LearnedPattern = {
        id: '',
        type: 'task_decomposition',
        pattern: `${taskMemory.title} -> ${taskMemory.plan.steps?.length || 0} steps`,
        description: `Successful approach for ${taskMemory.title}`,
        examples: [taskMemory.taskId],
        successRate: 1.0,
        usageCount: 1,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      await this.storePattern(pattern);
    }
  }

  private mapTaskMemoryFromEntity(entity: TaskMemoryEntity): TaskMemory {
    return {
      taskId: entity.taskId,
      title: entity.title,
      description: entity.description,
      agentId: entity.agentId,
      plan: entity.plan,
      result: entity.result,
      success: entity.success,
      tokensUsed: entity.tokensUsed,
      duration: entity.duration,
      timestamp: entity.timestamp,
      patterns: entity.patterns,
    };
  }

  private mapPatternFromEntity(entity: LearnedPatternEntity): LearnedPattern {
    return {
      id: entity.id,
      type: entity.type as any,
      pattern: entity.pattern,
      description: entity.description,
      examples: entity.examples,
      successRate: entity.successRate,
      usageCount: entity.usageCount,
      createdAt: entity.createdAt,
      lastUsed: entity.lastUsed || entity.createdAt,
    };
  }

  private mapCodeSnippetFromEntity(entity: CodeSnippetEntity): CodeSnippet {
    return {
      id: entity.id,
      language: entity.language,
      purpose: entity.purpose,
      code: entity.code,
      tags: entity.tags,
      usageCount: entity.usageCount,
      successRate: entity.successRate,
      createdAt: entity.createdAt,
      lastUsed: entity.lastUsed || entity.createdAt,
    };
  }

  async updatePatternUsage(patternId: string, success: boolean): Promise<void> {
    const pattern = await this.patternRepo.findOne({
      where: { id: patternId },
    });
    if (pattern) {
      pattern.usageCount++;
      pattern.lastUsed = new Date();
      // Update success rate with exponential moving average
      const alpha = 0.1; // Smoothing factor
      pattern.successRate =
        alpha * (success ? 1 : 0) + (1 - alpha) * pattern.successRate;
      await this.patternRepo.save(pattern);
    }
  }

  async updateCodeSnippetUsage(
    snippetId: string,
    success: boolean,
  ): Promise<void> {
    const snippet = await this.codeSnippetRepo.findOne({
      where: { id: snippetId },
    });
    if (snippet) {
      snippet.usageCount++;
      snippet.lastUsed = new Date();
      // Update success rate
      const alpha = 0.1;
      snippet.successRate =
        alpha * (success ? 1 : 0) + (1 - alpha) * snippet.successRate;
      await this.codeSnippetRepo.save(snippet);
    }
  }
}
