import { Repository } from 'typeorm';
import { LLMService } from '../../llm/llm.service';
import { ISemanticMemory, EmbeddingMetadata, SimilarityResult } from '../interfaces/memory.interface';
import { EmbeddingEntity } from '../entities/embedding.entity';
export declare class SemanticMemoryService implements ISemanticMemory {
    private embeddingRepo;
    private llmService;
    private readonly logger;
    private readonly embeddingDimension;
    constructor(embeddingRepo: Repository<EmbeddingEntity>, llmService: LLMService);
    storeEmbedding(content: string, metadata: EmbeddingMetadata): Promise<string>;
    searchSimilar(query: string, limit?: number): Promise<SimilarityResult[]>;
    updateEmbedding(id: string, metadata: Partial<EmbeddingMetadata>): Promise<void>;
    deleteEmbedding(id: string): Promise<void>;
    findByMetadata(filter: Partial<EmbeddingMetadata>): Promise<EmbeddingEntity[]>;
    getEmbeddingStats(): Promise<{
        total: number;
        byType: Record<string, number>;
        averageSimilarity?: number;
    }>;
    private generateEmbedding;
    storeBatchEmbeddings(items: Array<{
        content: string;
        metadata: EmbeddingMetadata;
    }>): Promise<string[]>;
    searchSimilarWithThreshold(query: string, threshold?: number, limit?: number): Promise<SimilarityResult[]>;
    private cosineSimilarity;
}
