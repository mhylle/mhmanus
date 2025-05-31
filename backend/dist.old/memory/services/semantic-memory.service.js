"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SemanticMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticMemoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const llm_service_1 = require("../../llm/llm.service");
const embedding_entity_1 = require("../entities/embedding.entity");
let SemanticMemoryService = SemanticMemoryService_1 = class SemanticMemoryService {
    embeddingRepo;
    llmService;
    logger = new common_1.Logger(SemanticMemoryService_1.name);
    embeddingDimension = 1536;
    constructor(embeddingRepo, llmService) {
        this.embeddingRepo = embeddingRepo;
        this.llmService = llmService;
    }
    async storeEmbedding(content, metadata) {
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
    async searchSimilar(query, limit = 10) {
        const queryEmbedding = await this.generateEmbedding(query);
        const allEmbeddings = await this.embeddingRepo.find({
            take: limit * 10,
        });
        const resultsWithSimilarity = allEmbeddings.map((embedding) => {
            const similarity = this.cosineSimilarity(queryEmbedding, embedding.embedding);
            return {
                id: embedding.id,
                content: embedding.content,
                metadata: embedding.metadata,
                similarity,
            };
        });
        const results = resultsWithSimilarity
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
        return results;
    }
    async updateEmbedding(id, metadata) {
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
    async deleteEmbedding(id) {
        await this.embeddingRepo.delete(id);
        this.logger.log(`Deleted embedding: ${id}`);
    }
    async findByMetadata(filter) {
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
    async getEmbeddingStats() {
        const total = await this.embeddingRepo.count();
        const byTypeResults = await this.embeddingRepo
            .createQueryBuilder('embedding')
            .select("embedding.metadata->>'type'", 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy("embedding.metadata->>'type'")
            .getRawMany();
        const byType = {};
        byTypeResults.forEach((r) => {
            byType[r.type] = parseInt(r.count);
        });
        return { total, byType };
    }
    async generateEmbedding(text) {
        this.logger.warn('Using mock embedding generation - implement real embedding API');
        const embedding = [];
        const seed = text
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        for (let i = 0; i < this.embeddingDimension; i++) {
            const value = Math.sin(seed * (i + 1)) * 0.5 + 0.5;
            embedding.push(value);
        }
        return embedding;
    }
    async storeBatchEmbeddings(items) {
        const entities = await Promise.all(items.map(async (item) => {
            const embedding = await this.generateEmbedding(item.content);
            return this.embeddingRepo.create({
                content: item.content,
                embedding,
                metadata: item.metadata,
            });
        }));
        const saved = await this.embeddingRepo.save(entities);
        return saved.map((s) => s.id);
    }
    async searchSimilarWithThreshold(query, threshold = 0.7, limit = 10) {
        const results = await this.searchSimilar(query, limit);
        return results.filter((r) => r.similarity >= threshold);
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length)
            return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
};
exports.SemanticMemoryService = SemanticMemoryService;
exports.SemanticMemoryService = SemanticMemoryService = SemanticMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(embedding_entity_1.EmbeddingEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        llm_service_1.LLMService])
], SemanticMemoryService);
//# sourceMappingURL=semantic-memory.service.js.map