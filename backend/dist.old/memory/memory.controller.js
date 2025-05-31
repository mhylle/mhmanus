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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryController = void 0;
const common_1 = require("@nestjs/common");
const memory_service_1 = require("./memory.service");
let MemoryController = class MemoryController {
    memoryService;
    constructor(memoryService) {
        this.memoryService = memoryService;
    }
    async getMemoryStats() {
        return this.memoryService.getMemoryStats();
    }
    async getAgentMemory(agentId) {
        return this.memoryService.getAgentMemory(agentId);
    }
    async searchSimilar(body) {
        return this.memoryService.semantic.searchSimilar(body.query, body.limit || 10);
    }
    async getPatterns(type) {
        return this.memoryService.longTerm.getPatterns(type);
    }
    async getRecentEpisodes(limit = '10') {
        return this.memoryService.episodic.getRecentEpisodes(parseInt(limit));
    }
    async analyzeEpisodePatterns() {
        return this.memoryService.episodic.analyzeEpisodePatterns();
    }
    async getTaskHistory(agentId, limit = '20') {
        return this.memoryService.longTerm.getTaskHistory({
            agentId,
            limit: parseInt(limit),
        });
    }
    async recallSimilarTasks(task) {
        return this.memoryService.recallSimilarTasks(task);
    }
    async getRecentInteractions(limit = '10') {
        return this.memoryService.shortTerm.getRecentInteractions(parseInt(limit));
    }
    async getActiveAgents() {
        return this.memoryService.shortTerm.getActiveAgents();
    }
    async learnFromTask(taskId) {
        await this.memoryService.learnFromSuccess(taskId);
        return { message: `Learning from task ${taskId} completed` };
    }
    async getEmbeddingStats() {
        return this.memoryService.semantic.getEmbeddingStats();
    }
    async getEpisodeStats() {
        return this.memoryService.episodic.getEpisodeStats();
    }
};
exports.MemoryController = MemoryController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getMemoryStats", null);
__decorate([
    (0, common_1.Get)('agent/:agentId'),
    __param(0, (0, common_1.Param)('agentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getAgentMemory", null);
__decorate([
    (0, common_1.Post)('search/similar'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "searchSimilar", null);
__decorate([
    (0, common_1.Get)('patterns'),
    __param(0, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getPatterns", null);
__decorate([
    (0, common_1.Get)('episodes/recent'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getRecentEpisodes", null);
__decorate([
    (0, common_1.Get)('episodes/patterns'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "analyzeEpisodePatterns", null);
__decorate([
    (0, common_1.Get)('tasks/history'),
    __param(0, (0, common_1.Query)('agentId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getTaskHistory", null);
__decorate([
    (0, common_1.Post)('recall'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "recallSimilarTasks", null);
__decorate([
    (0, common_1.Get)('interactions/recent'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getRecentInteractions", null);
__decorate([
    (0, common_1.Get)('active-agents'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getActiveAgents", null);
__decorate([
    (0, common_1.Post)('learn/:taskId'),
    __param(0, (0, common_1.Param)('taskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "learnFromTask", null);
__decorate([
    (0, common_1.Get)('embeddings/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getEmbeddingStats", null);
__decorate([
    (0, common_1.Get)('episodes/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MemoryController.prototype, "getEpisodeStats", null);
exports.MemoryController = MemoryController = __decorate([
    (0, common_1.Controller)('memory'),
    __metadata("design:paramtypes", [memory_service_1.MemoryService])
], MemoryController);
//# sourceMappingURL=memory.controller.js.map