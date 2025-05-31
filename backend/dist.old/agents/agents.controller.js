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
exports.AgentsController = void 0;
const common_1 = require("@nestjs/common");
const agents_service_1 = require("./agents.service");
const agent_registry_1 = require("./agent.registry");
let AgentsController = class AgentsController {
    agentsService;
    agentRegistry;
    constructor(agentsService, agentRegistry) {
        this.agentsService = agentsService;
        this.agentRegistry = agentRegistry;
    }
    async getAllAgents() {
        const agents = this.agentRegistry.getAllAgents();
        return agents.map((agent) => ({
            id: agent.metadata.id,
            name: agent.metadata.name,
            type: agent.metadata.type,
            model: agent.metadata.model,
            description: agent.metadata.description,
            capabilities: agent.metadata.capabilities,
        }));
    }
    async getAgentStatus() {
        return this.agentsService.getAgentStatus();
    }
    async getRegistry() {
        return this.agentRegistry.getAgentStats();
    }
    async getAgent(agentId) {
        const agent = this.agentRegistry.getAgent(agentId);
        if (!agent) {
            return { error: 'Agent not found' };
        }
        return {
            id: agent.metadata.id,
            name: agent.metadata.name,
            type: agent.metadata.type,
            model: agent.metadata.model,
            description: agent.metadata.description,
            capabilities: agent.metadata.capabilities,
            maxConcurrentTasks: agent.metadata.maxConcurrentTasks,
        };
    }
    async testCommunication() {
        return this.agentsService.testAgentCommunication();
    }
    async getExecutionTrace(sessionId) {
        const trace = await this.agentsService.getExecutionTrace(sessionId);
        return trace || { error: 'Trace not found' };
    }
};
exports.AgentsController = AgentsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getAllAgents", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getAgentStatus", null);
__decorate([
    (0, common_1.Get)('registry'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getRegistry", null);
__decorate([
    (0, common_1.Get)(':agentId'),
    __param(0, (0, common_1.Param)('agentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getAgent", null);
__decorate([
    (0, common_1.Post)('test-communication'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "testCommunication", null);
__decorate([
    (0, common_1.Get)('trace/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getExecutionTrace", null);
exports.AgentsController = AgentsController = __decorate([
    (0, common_1.Controller)('agents'),
    __metadata("design:paramtypes", [agents_service_1.AgentsService,
        agent_registry_1.AgentRegistry])
], AgentsController);
//# sourceMappingURL=agents.controller.js.map