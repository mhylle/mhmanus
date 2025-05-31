import { Repository } from 'typeorm';
import { IEpisodicMemory, Episode, EpisodePattern } from '../interfaces/memory.interface';
import { EpisodeEntity } from '../entities/task-memory.entity';
import { SemanticMemoryService } from './semantic-memory.service';
export declare class EpisodicMemoryService implements IEpisodicMemory {
    private episodeRepo;
    private semanticMemory;
    private readonly logger;
    constructor(episodeRepo: Repository<EpisodeEntity>, semanticMemory: SemanticMemoryService);
    storeEpisode(episode: Episode): Promise<void>;
    findSimilarEpisodes(task: any, limit?: number): Promise<Episode[]>;
    getSuccessfulEpisodes(taskType?: string): Promise<Episode[]>;
    analyzeEpisodePatterns(): Promise<EpisodePattern[]>;
    private generateEpisodeDescription;
    private mapEpisodeFromEntity;
    getEpisodeStats(): Promise<{
        total: number;
        successful: number;
        failed: number;
        byTaskType: Record<string, {
            total: number;
            successRate: number;
        }>;
        averageDuration: number;
    }>;
    getRecentEpisodes(limit?: number): Promise<Episode[]>;
}
