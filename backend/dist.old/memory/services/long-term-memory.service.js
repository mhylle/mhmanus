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
var LongTermMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongTermMemoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const task_memory_entity_1 = require("../entities/task-memory.entity");
let LongTermMemoryService = LongTermMemoryService_1 = class LongTermMemoryService {
    taskMemoryRepo;
    patternRepo;
    codeSnippetRepo;
    logger = new common_1.Logger(LongTermMemoryService_1.name);
    constructor(taskMemoryRepo, patternRepo, codeSnippetRepo) {
        this.taskMemoryRepo = taskMemoryRepo;
        this.patternRepo = patternRepo;
        this.codeSnippetRepo = codeSnippetRepo;
    }
    async store(key, value) {
        throw new Error('Use specific storage methods for long-term memory');
    }
    async retrieve(key) {
        throw new Error('Use specific retrieval methods for long-term memory');
    }
    async delete(key) {
        if (key.startsWith('task:')) {
            await this.taskMemoryRepo.delete({ taskId: key.replace('task:', '') });
        }
        else if (key.startsWith('pattern:')) {
            await this.patternRepo.delete(key.replace('pattern:', ''));
        }
        else if (key.startsWith('snippet:')) {
            await this.codeSnippetRepo.delete(key.replace('snippet:', ''));
        }
    }
    async exists(key) {
        if (key.startsWith('task:')) {
            const count = await this.taskMemoryRepo.count({
                where: { taskId: key.replace('task:', '') },
            });
            return count > 0;
        }
        return false;
    }
    async clear() {
        await this.taskMemoryRepo.clear();
        await this.patternRepo.clear();
        await this.codeSnippetRepo.clear();
        this.logger.warn('Cleared all long-term memory');
    }
    async storeTaskResult(taskId, result) {
        const entity = this.taskMemoryRepo.create({
            ...result,
            taskId,
        });
        await this.taskMemoryRepo.save(entity);
        this.logger.log(`Stored task result for ${taskId}`);
        if (result.success) {
            await this.extractAndStorePatterns(result);
        }
    }
    async getTaskHistory(filter) {
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
    async storePattern(pattern) {
        const existing = await this.patternRepo.findOne({
            where: { pattern: pattern.pattern, type: pattern.type },
        });
        if (existing) {
            existing.usageCount++;
            existing.lastUsed = new Date();
            existing.examples = [
                ...new Set([...existing.examples, ...pattern.examples]),
            ];
            existing.successRate = (existing.successRate + pattern.successRate) / 2;
            await this.patternRepo.save(existing);
        }
        else {
            const entity = this.patternRepo.create(pattern);
            await this.patternRepo.save(entity);
        }
        this.logger.log(`Stored pattern of type: ${pattern.type}`);
    }
    async getPatterns(type) {
        const where = type ? { type } : {};
        const patterns = await this.patternRepo.find({
            where,
            order: { successRate: 'DESC', usageCount: 'DESC' },
        });
        return patterns.map(this.mapPatternFromEntity);
    }
    async storeCodeSnippet(snippet) {
        const entity = this.codeSnippetRepo.create(snippet);
        await this.codeSnippetRepo.save(entity);
        this.logger.log(`Stored code snippet: ${snippet.purpose}`);
    }
    async searchCodeSnippets(query) {
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
    async extractAndStorePatterns(taskMemory) {
        if (taskMemory.plan && taskMemory.result) {
            const pattern = {
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
    mapTaskMemoryFromEntity(entity) {
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
    mapPatternFromEntity(entity) {
        return {
            id: entity.id,
            type: entity.type,
            pattern: entity.pattern,
            description: entity.description,
            examples: entity.examples,
            successRate: entity.successRate,
            usageCount: entity.usageCount,
            createdAt: entity.createdAt,
            lastUsed: entity.lastUsed || entity.createdAt,
        };
    }
    mapCodeSnippetFromEntity(entity) {
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
    async updatePatternUsage(patternId, success) {
        const pattern = await this.patternRepo.findOne({
            where: { id: patternId },
        });
        if (pattern) {
            pattern.usageCount++;
            pattern.lastUsed = new Date();
            const alpha = 0.1;
            pattern.successRate =
                alpha * (success ? 1 : 0) + (1 - alpha) * pattern.successRate;
            await this.patternRepo.save(pattern);
        }
    }
    async updateCodeSnippetUsage(snippetId, success) {
        const snippet = await this.codeSnippetRepo.findOne({
            where: { id: snippetId },
        });
        if (snippet) {
            snippet.usageCount++;
            snippet.lastUsed = new Date();
            const alpha = 0.1;
            snippet.successRate =
                alpha * (success ? 1 : 0) + (1 - alpha) * snippet.successRate;
            await this.codeSnippetRepo.save(snippet);
        }
    }
};
exports.LongTermMemoryService = LongTermMemoryService;
exports.LongTermMemoryService = LongTermMemoryService = LongTermMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_memory_entity_1.TaskMemoryEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(task_memory_entity_1.LearnedPatternEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(task_memory_entity_1.CodeSnippetEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], LongTermMemoryService);
//# sourceMappingURL=long-term-memory.service.js.map