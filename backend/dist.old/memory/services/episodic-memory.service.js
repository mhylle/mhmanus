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
var EpisodicMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodicMemoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const task_memory_entity_1 = require("../entities/task-memory.entity");
const semantic_memory_service_1 = require("./semantic-memory.service");
let EpisodicMemoryService = EpisodicMemoryService_1 = class EpisodicMemoryService {
    episodeRepo;
    semanticMemory;
    logger = new common_1.Logger(EpisodicMemoryService_1.name);
    constructor(episodeRepo, semanticMemory) {
        this.episodeRepo = episodeRepo;
        this.semanticMemory = semanticMemory;
    }
    async storeEpisode(episode) {
        const entity = this.episodeRepo.create(episode);
        await this.episodeRepo.save(entity);
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
    async findSimilarEpisodes(task, limit = 5) {
        const taskDescription = `${task.title} ${task.description}`;
        const similarResults = await this.semanticMemory.searchSimilar(taskDescription, limit * 2);
        const episodeIds = [];
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
        if (episodeIds.length === 0)
            return [];
        const episodes = await this.episodeRepo
            .createQueryBuilder('episode')
            .where('episode.id IN (:...ids)', { ids: episodeIds })
            .getMany();
        return episodes.map(this.mapEpisodeFromEntity);
    }
    async getSuccessfulEpisodes(taskType) {
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
    async analyzeEpisodePatterns() {
        const successfulEpisodes = await this.episodeRepo.find({
            where: { success: true },
            order: { endTime: 'DESC' },
            take: 1000,
        });
        const patterns = new Map();
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
            const pattern = patterns.get(patternKey);
            pattern.count++;
            pattern.totalDuration +=
                episode.endTime.getTime() - episode.startTime.getTime();
            pattern.successCount++;
            for (const step of episode.steps) {
                const stepKey = step.action;
                pattern.commonSteps.set(stepKey, (pattern.commonSteps.get(stepKey) || 0) + 1);
            }
        }
        const results = [];
        for (const [pattern, data] of patterns.entries()) {
            const commonalities = Array.from(data.commonSteps.entries())
                .filter(([_, count]) => count > data.count * 0.7)
                .map(([step]) => step);
            results.push({
                pattern,
                frequency: data.count,
                successRate: data.successCount / data.count,
                averageDuration: data.totalDuration / data.count,
                commonalities,
            });
        }
        results.sort((a, b) => b.frequency - a.frequency);
        return results.slice(0, 20);
    }
    generateEpisodeDescription(episode) {
        const steps = episode.steps.map((s) => s.action).join(', ');
        const outcome = episode.success ? 'successful' : 'failed';
        return `${episode.taskType} task ${outcome} with steps: ${steps}`;
    }
    mapEpisodeFromEntity(entity) {
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
    async getEpisodeStats() {
        const total = await this.episodeRepo.count();
        const successful = await this.episodeRepo.count({
            where: { success: true },
        });
        const failed = total - successful;
        const byTypeStats = await this.episodeRepo
            .createQueryBuilder('episode')
            .select('episode.taskType', 'taskType')
            .addSelect('COUNT(*)', 'total')
            .addSelect('SUM(CASE WHEN episode.success THEN 1 ELSE 0 END)', 'successful')
            .addSelect('AVG(EXTRACT(EPOCH FROM (episode.endTime - episode.startTime)))', 'avgDuration')
            .groupBy('episode.taskType')
            .getRawMany();
        const byTaskType = {};
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
    async getRecentEpisodes(limit = 10) {
        const episodes = await this.episodeRepo.find({
            order: { endTime: 'DESC' },
            take: limit,
        });
        return episodes.map(this.mapEpisodeFromEntity);
    }
};
exports.EpisodicMemoryService = EpisodicMemoryService;
exports.EpisodicMemoryService = EpisodicMemoryService = EpisodicMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_memory_entity_1.EpisodeEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        semantic_memory_service_1.SemanticMemoryService])
], EpisodicMemoryService);
//# sourceMappingURL=episodic-memory.service.js.map