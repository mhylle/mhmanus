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
var AgentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const agent_registry_1 = require("./agent.registry");
const agent_communication_bus_1 = require("./communication/agent-communication.bus");
const memory_service_1 = require("../memory/memory.service");
const agent_interface_1 = require("./interfaces/agent.interface");
let AgentsService = AgentsService_1 = class AgentsService {
    agentRegistry;
    communicationBus;
    memoryService;
    logger = new common_1.Logger(AgentsService_1.name);
    constructor(agentRegistry, communicationBus, memoryService) {
        this.agentRegistry = agentRegistry;
        this.communicationBus = communicationBus;
        this.memoryService = memoryService;
    }
    async processTask(task) {
        this.logger.log(`Processing task ${task.id} with agent system`);
        const context = this.createContext(task);
        const agent = await this.agentRegistry.findBestAgentForTask(task);
        if (!agent) {
            throw new Error('No suitable agent found for task');
        }
        this.logger.log(`Selected agent: ${agent.metadata.name} for task ${task.id}`);
        try {
            const plan = await agent.plan(task, context);
            this.logger.log(`Created plan with ${plan.steps.length} steps`);
            const result = await agent.execute(plan, context);
            const isValid = await agent.validate(result);
            if (!isValid) {
                this.logger.warn(`Result validation failed for task ${task.id}`);
            }
            context.trace.endTime = new Date();
            try {
                await this.memoryService.rememberTask(task, result, context);
                this.logger.log(`Stored task ${task.id} in memory for future learning`);
            }
            catch (memoryError) {
                this.logger.error(`Failed to store task in memory`, memoryError);
            }
            return {
                ...result,
                metadata: {
                    agentId: agent.metadata.id,
                    agentName: agent.metadata.name,
                    trace: context.trace,
                    contextData: Object.fromEntries(context.sharedMemory),
                },
            };
        }
        catch (error) {
            this.logger.error(`Failed to process task ${task.id}`, error);
            return {
                success: false,
                output: null,
                reasoning: `Processing failed: ${error.message}`,
                tokensUsed: 0,
                duration: Date.now() - context.trace.startTime.getTime(),
            };
        }
    }
    createContext(task) {
        return {
            taskId: task.id,
            sessionId: (0, uuid_1.v4)(),
            sharedMemory: new Map(),
            trace: {
                spans: [],
                startTime: new Date(),
            },
        };
    }
    async getAgentStatus() {
        return {
            registry: this.agentRegistry.getAgentStats(),
            communication: this.communicationBus.getMessageStats(),
            activeAgents: this.communicationBus.getActiveAgents(),
        };
    }
    async testAgentCommunication() {
        await this.communicationBus.broadcast({
            id: (0, uuid_1.v4)(),
            from: 'system',
            to: 'broadcast',
            type: agent_interface_1.MessageType.STATUS_UPDATE,
            payload: { status: 'Communication test' },
            timestamp: new Date(),
        });
        return {
            success: true,
            activeAgents: this.communicationBus.getActiveAgents(),
        };
    }
    async getExecutionTrace(sessionId) {
        const messages = this.communicationBus.getMessageHistory({
            since: new Date(Date.now() - 3600000),
        });
        if (messages.length === 0) {
            return null;
        }
        const trace = {
            spans: messages.map((msg) => ({
                spanId: msg.id,
                agentId: msg.from,
                operation: msg.type,
                startTime: msg.timestamp,
                endTime: msg.timestamp,
                attributes: {
                    to: msg.to,
                    type: msg.type,
                },
                events: [],
            })),
            startTime: messages[0]?.timestamp || new Date(),
            endTime: messages[messages.length - 1]?.timestamp || new Date(),
        };
        return trace;
    }
};
exports.AgentsService = AgentsService;
exports.AgentsService = AgentsService = AgentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agent_registry_1.AgentRegistry,
        agent_communication_bus_1.AgentCommunicationBus,
        memory_service_1.MemoryService])
], AgentsService);
//# sourceMappingURL=agents.service.js.map