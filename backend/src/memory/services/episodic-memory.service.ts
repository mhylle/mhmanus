import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IEpisodicMemory,
  Episode,
  EpisodePattern,
} from '../interfaces/memory.interface';
import { EpisodeEntity } from '../entities/task-memory.entity';
import { SemanticMemoryService } from './semantic-memory.service';

@Injectable()
export class EpisodicMemoryService implements IEpisodicMemory {
  private readonly logger = new Logger(EpisodicMemoryService.name);

  constructor(
    @InjectRepository(EpisodeEntity)
    private episodeRepo: Repository<EpisodeEntity>,
    private semanticMemory: SemanticMemoryService,
  ) {}

  async storeEpisode(episode: Episode): Promise<void> {
    const entity = this.episodeRepo.create(episode);
    await this.episodeRepo.save(entity);

    // Store episode in semantic memory for similarity search
    const episodeDescription = this.generateEpisodeDescription(episode);
    await this.semanticMemory.storeEmbedding(episodeDescription, {
      type: 'episode',
      source: 'episodic_memory',
      agentId: episode.agentId,
      taskId: episode.taskId,
      timestamp: new Date(),
    });

    this.logger.log(`Stored episode for task ${episode.taskId}`);
  }

  async findSimilarEpisodes(task: any, limit: number = 5): Promise<Episode[]> {
    // Use semantic search to find similar episodes
    const taskDescription = `${task.title} ${task.description}`;
    const similarResults = await this.semanticMemory.searchSimilar(
      taskDescription,
      limit * 2,
    );

    // Filter for episode type and get the actual episodes
    const episodeIds: string[] = [];
    for (const result of similarResults) {
      if (result.metadata.type === 'episode' && result.metadata.taskId) {
        const episode = await this.episodeRepo.findOne({
          where: { taskId: result.metadata.taskId },
        });
        if (episode && episodeIds.length < limit) {
          episodeIds.push(episode.id);
        }
      }
    }

    // Fetch full episodes
    if (episodeIds.length === 0) return [];

    const episodes = await this.episodeRepo
      .createQueryBuilder('episode')
      .where('episode.id IN (:...ids)', { ids: episodeIds })
      .getMany();

    return episodes.map(this.mapEpisodeFromEntity);
  }

  async getSuccessfulEpisodes(taskType?: string): Promise<Episode[]> {
    const query = this.episodeRepo
      .createQueryBuilder('episode')
      .where('episode.success = :success', { success: true });

    if (taskType) {
      query.andWhere('episode.taskType = :taskType', { taskType });
    }

    query.orderBy('episode.endTime', 'DESC').limit(100);

    const episodes = await query.getMany();
    return episodes.map(this.mapEpisodeFromEntity);
  }

  async analyzeEpisodePatterns(): Promise<EpisodePattern[]> {
    // Analyze common patterns in successful episodes
    const successfulEpisodes = await this.episodeRepo.find({
      where: { success: true },
      order: { endTime: 'DESC' },
      take: 1000,
    });

    const patterns = new Map<
      string,
      {
        count: number;
        totalDuration: number;
        successCount: number;
        commonSteps: Map<string, number>;
      }
    >();

    // Extract patterns from episodes
    for (const episode of successfulEpisodes) {
      const patternKey = `${episode.taskType}_${episode.steps.length}steps`;

      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, {
          count: 0,
          totalDuration: 0,
          successCount: 0,
          commonSteps: new Map(),
        });
      }

      const pattern = patterns.get(patternKey)!;
      pattern.count++;
      pattern.totalDuration +=
        episode.endTime.getTime() - episode.startTime.getTime();
      pattern.successCount++;

      // Track common steps
      for (const step of episode.steps) {
        const stepKey = step.action;
        pattern.commonSteps.set(
          stepKey,
          (pattern.commonSteps.get(stepKey) || 0) + 1,
        );
      }
    }

    // Convert to EpisodePattern array
    const results: EpisodePattern[] = [];
    for (const [pattern, data] of patterns.entries()) {
      const commonalities = Array.from(data.commonSteps.entries())
        .filter(([_, count]) => count > data.count * 0.7) // Steps that appear in >70% of episodes
        .map(([step]) => step);

      results.push({
        pattern,
        frequency: data.count,
        successRate: data.successCount / data.count,
        averageDuration: data.totalDuration / data.count,
        commonalities,
      });
    }

    // Sort by frequency
    results.sort((a, b) => b.frequency - a.frequency);
    return results.slice(0, 20); // Top 20 patterns
  }

  // Utility methods
  private generateEpisodeDescription(episode: Episode): string {
    const steps = episode.steps.map((s) => s.action).join(', ');
    const outcome = episode.success ? 'successful' : 'failed';
    return `${episode.taskType} task ${outcome} with steps: ${steps}`;
  }

  private mapEpisodeFromEntity(entity: EpisodeEntity): Episode {
    return {
      id: entity.id,
      taskId: entity.taskId,
      agentId: entity.agentId,
      taskType: entity.taskType,
      startTime: entity.startTime,
      endTime: entity.endTime,
      success: entity.success,
      steps: entity.steps,
      decisions: entity.decisions,
      outcome: entity.outcome,
      learnings: entity.learnings,
    };
  }

  async getEpisodeStats(): Promise<{
    total: number;
    successful: number;
    failed: number;
    byTaskType: Record<string, { total: number; successRate: number }>;
    averageDuration: number;
  }> {
    const total = await this.episodeRepo.count();
    const successful = await this.episodeRepo.count({
      where: { success: true },
    });
    const failed = total - successful;

    // Stats by task type
    const byTypeStats = await this.episodeRepo
      .createQueryBuilder('episode')
      .select('episode.taskType', 'taskType')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN episode.success THEN 1 ELSE 0 END)',
        'successful',
      )
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (episode.endTime - episode.startTime)))',
        'avgDuration',
      )
      .groupBy('episode.taskType')
      .getRawMany();

    const byTaskType: Record<string, { total: number; successRate: number }> =
      {};
    let totalDuration = 0;
    let durationCount = 0;

    for (const stat of byTypeStats) {
      byTaskType[stat.taskType] = {
        total: parseInt(stat.total),
        successRate: parseInt(stat.successful) / parseInt(stat.total),
      };
      totalDuration += parseFloat(stat.avgDuration) * parseInt(stat.total);
      durationCount += parseInt(stat.total);
    }

    return {
      total,
      successful,
      failed,
      byTaskType,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
    };
  }

  async getRecentEpisodes(limit: number = 10): Promise<Episode[]> {
    const episodes = await this.episodeRepo.find({
      order: { endTime: 'DESC' },
      take: limit,
    });

    return episodes.map(this.mapEpisodeFromEntity);
  }
}
