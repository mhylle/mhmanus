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
var MemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const common_1 = require("@nestjs/common");
const short_term_memory_service_1 = require("./services/short-term-memory.service");
const long_term_memory_service_1 = require("./services/long-term-memory.service");
const semantic_memory_service_1 = require("./services/semantic-memory.service");
const episodic_memory_service_1 = require("./services/episodic-memory.service");
let MemoryService = MemoryService_1 = class MemoryService {
    shortTerm;
    longTerm;
    semantic;
    episodic;
    logger = new common_1.Logger(MemoryService_1.name);
    constructor(shortTerm, longTerm, semantic, episodic) {
        this.shortTerm = shortTerm;
        this.longTerm = longTerm;
        this.semantic = semantic;
        this.episodic = episodic;
    }
    async onModuleInit() {
        this.logger.log('Memory service initialized with all layers');
        await this.performHealthCheck();
    }
    async rememberTask(task, result, context) {
        const taskMemory = {
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
        await this.longTerm.storeTaskResult(task.id, taskMemory);
        const episode = {
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
        const taskDescription = `${task.title}: ${task.description}. Result: ${result.success ? 'Success' : 'Failed'}`;
        await this.semantic.storeEmbedding(taskDescription, {
            type: 'task',
            source: 'task_completion',
            agentId: context.parentAgentId,
            taskId: task.id,
            timestamp: new Date(),
        });
        this.logger.log(`Remembered task ${task.id} across all memory layers`);
    }
    async recallSimilarTasks(task, limit = 5) {
        const taskDescription = `${task.title} ${task.description}`;
        const semanticResults = await this.semantic.searchSimilar(taskDescription, limit);
        const taskIds = semanticResults
            .filter((r) => r.metadata.taskId)
            .map((r) => r.metadata.taskId);
        const similar = [];
        for (const taskId of taskIds) {
            const memories = await this.longTerm.getTaskHistory({
                taskType: taskId,
                limit: 1,
            });
            if (memories.length > 0) {
                similar.push(memories[0]);
            }
        }
        const episodes = await this.episodic.findSimilarEpisodes(task, limit);
        const patterns = await this.longTerm.getPatterns();
        const relevantPatterns = patterns
            .filter((p) => taskDescription.toLowerCase().includes(p.pattern.toLowerCase()) ||
            p.pattern.toLowerCase().includes(taskDescription.toLowerCase()))
            .slice(0, 3);
        return { similar, episodes, patterns: relevantPatterns };
    }
    async getAgentMemory(agentId) {
        const context = await this.shortTerm.getContext(agentId);
        const recentTasks = await this.longTerm.getTaskHistory({
            agentId,
            limit: 10,
        });
        const patterns = await this.longTerm.getPatterns();
        return { context, recentTasks, patterns };
    }
    async getMemoryStats() {
        const stmStats = await this.shortTerm.getMemoryStats();
        const embeddingStats = await this.semantic.getEmbeddingStats();
        const episodeStats = await this.episodic.getEpisodeStats();
        const totalTasks = await this.longTerm.getTaskHistory();
        const patterns = await this.longTerm.getPatterns();
        const snippets = await this.longTerm.searchCodeSnippets('');
        return {
            shortTerm: {
                activeContexts: stmStats.contextCount,
                recentInteractions: stmStats.interactionCount,
                memoryUsage: 0,
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
    async learnFromSuccess(taskId) {
        const taskHistory = await this.longTerm.getTaskHistory({ limit: 1 });
        if (taskHistory.length === 0)
            return;
        const task = taskHistory[0];
        if (!task.success)
            return;
        const pattern = {
            id: '',
            type: 'task_decomposition',
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
    classifyTaskType(task) {
        const title = task.title.toLowerCase();
        if (title.includes('api') || title.includes('endpoint'))
            return 'api_development';
        if (title.includes('test'))
            return 'testing';
        if (title.includes('fix') || title.includes('bug'))
            return 'bug_fix';
        if (title.includes('refactor'))
            return 'refactoring';
        if (title.includes('implement') || title.includes('create'))
            return 'feature_development';
        return 'general';
    }
    extractStepsFromTrace(trace) {
        if (!trace.spans)
            return [];
        return trace.spans.map((span, index) => ({
            order: index + 1,
            action: span.operation,
            input: span.attributes,
            output: span.events.find((e) => e.name.includes('completed'))
                ?.attributes || {},
            duration: span.endTime
                ? new Date(span.endTime).getTime() - new Date(span.startTime).getTime()
                : 0,
            success: !span.events.find((e) => e.name.includes('failed')),
        }));
    }
    extractLearnings(result) {
        const learnings = [];
        if (result.reasoning) {
            learnings.push(`Approach: ${result.reasoning}`);
        }
        if (result.subResults && result.subResults.length > 0) {
            const successfulSteps = result.subResults.filter((r) => r.success).length;
            learnings.push(`${successfulSteps}/${result.subResults.length} sub-tasks succeeded`);
        }
        return learnings;
    }
    extractPatternFromTask(task) {
        const stepCount = task.plan?.steps?.length || 0;
        return `${task.title} -> ${stepCount} steps, ${task.duration}ms`;
    }
    async performHealthCheck() {
        try {
            await this.shortTerm.exists('health_check');
            this.logger.log('Short-term memory (Redis) is healthy');
            const stats = await this.getMemoryStats();
            this.logger.log('Long-term memory (PostgreSQL) is healthy');
            this.logger.log(`Memory stats: ${JSON.stringify(stats)}`);
        }
        catch (error) {
            this.logger.error('Memory health check failed', error);
        }
    }
};
exports.MemoryService = MemoryService;
exports.MemoryService = MemoryService = MemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [short_term_memory_service_1.ShortTermMemoryService,
        long_term_memory_service_1.LongTermMemoryService,
        semantic_memory_service_1.SemanticMemoryService,
        episodic_memory_service_1.EpisodicMemoryService])
], MemoryService);
//# sourceMappingURL=memory.service.js.map