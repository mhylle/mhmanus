import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LLMService } from '../../llm/llm.service';
import {
  ISemanticMemory,
  EmbeddingMetadata,
  SimilarityResult,
} from '../interfaces/memory.interface';
import { EmbeddingEntity } from '../entities/embedding.entity';

@Injectable()
export class SemanticMemoryService implements ISemanticMemory {
  private readonly logger = new Logger(SemanticMemoryService.name);
  private readonly embeddingDimension = 1536; // Default for many models

  constructor(
    @InjectRepository(EmbeddingEntity)
    private embeddingRepo: Repository<EmbeddingEntity>,
    private llmService: LLMService,
  ) {}

  async storeEmbedding(
    content: string,
    metadata: EmbeddingMetadata,
  ): Promise<string> {
    // Generate embedding using LLM service
    const embedding = await this.generateEmbedding(content);

    const entity = this.embeddingRepo.create({
      content,
      embedding,
      metadata,
    });

    const saved = await this.embeddingRepo.save(entity);
    this.logger.log(`Stored embedding for ${metadata.type}: ${saved.id}`);

    return saved.id;
  }

  async searchSimilar(
    query: string,
    limit: number = 10,
  ): Promise<SimilarityResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // For now, use a simple approach without pgvector operators
    // In production, you'd want to use pgvector's <=> operator
    const allEmbeddings = await this.embeddingRepo.find({
      take: limit * 10, // Get more to filter
    });

    // Calculate cosine similarity manually
    const resultsWithSimilarity = allEmbeddings.map((embedding) => {
      const similarity = this.cosineSimilarity(
        queryEmbedding,
        embedding.embedding,
      );
      return {
        id: embedding.id,
        content: embedding.content,
        metadata: embedding.metadata,
        similarity,
      };
    });

    // Sort by similarity and take top results
    const results = resultsWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  async updateEmbedding(
    id: string,
    metadata: Partial<EmbeddingMetadata>,
  ): Promise<void> {
    const embedding = await this.embeddingRepo.findOne({ where: { id } });
    if (!embedding) {
      throw new Error(`Embedding ${id} not found`);
    }

    embedding.metadata = {
      ...embedding.metadata,
      ...metadata,
    };

    await this.embeddingRepo.save(embedding);
    this.logger.log(`Updated embedding metadata: ${id}`);
  }

  async deleteEmbedding(id: string): Promise<void> {
    await this.embeddingRepo.delete(id);
    this.logger.log(`Deleted embedding: ${id}`);
  }

  // Additional methods
  async findByMetadata(
    filter: Partial<EmbeddingMetadata>,
  ): Promise<EmbeddingEntity[]> {
    const query = this.embeddingRepo.createQueryBuilder('embedding');

    if (filter.type) {
      query.andWhere("embedding.metadata->>'type' = :type", {
        type: filter.type,
      });
    }
    if (filter.source) {
      query.andWhere("embedding.metadata->>'source' = :source", {
        source: filter.source,
      });
    }
    if (filter.agentId) {
      query.andWhere("embedding.metadata->>'agentId' = :agentId", {
        agentId: filter.agentId,
      });
    }
    if (filter.taskId) {
      query.andWhere("embedding.metadata->>'taskId' = :taskId", {
        taskId: filter.taskId,
      });
    }

    return query.getMany();
  }

  async getEmbeddingStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    averageSimilarity?: number;
  }> {
    const total = await this.embeddingRepo.count();

    // Count by type
    const byTypeResults = await this.embeddingRepo
      .createQueryBuilder('embedding')
      .select("embedding.metadata->>'type'", 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy("embedding.metadata->>'type'")
      .getRawMany();

    const byType: Record<string, number> = {};
    byTypeResults.forEach((r) => {
      byType[r.type] = parseInt(r.count);
    });

    return { total, byType };
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, this would call an embedding API
    // For now, we'll generate a mock embedding
    this.logger.warn(
      'Using mock embedding generation - implement real embedding API',
    );

    // Generate deterministic mock embedding based on text
    const embedding: number[] = [];
    const seed = text
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    for (let i = 0; i < this.embeddingDimension; i++) {
      // Simple deterministic pseudo-random based on seed and position
      const value = Math.sin(seed * (i + 1)) * 0.5 + 0.5;
      embedding.push(value);
    }

    return embedding;
  }

  // Batch operations for efficiency
  async storeBatchEmbeddings(
    items: Array<{ content: string; metadata: EmbeddingMetadata }>,
  ): Promise<string[]> {
    const entities = await Promise.all(
      items.map(async (item) => {
        const embedding = await this.generateEmbedding(item.content);
        return this.embeddingRepo.create({
          content: item.content,
          embedding,
          metadata: item.metadata,
        });
      }),
    );

    const saved = await this.embeddingRepo.save(entities);
    return saved.map((s) => s.id);
  }

  async searchSimilarWithThreshold(
    query: string,
    threshold: number = 0.7,
    limit: number = 10,
  ): Promise<SimilarityResult[]> {
    const results = await this.searchSimilar(query, limit);
    return results.filter((r) => r.similarity >= threshold);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
