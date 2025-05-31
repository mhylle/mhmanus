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
var AgentRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const agent_interface_1 = require("./interfaces/agent.interface");
const director_agent_1 = require("./director/director.agent");
const code_agent_1 = require("./code/code.agent");
let AgentRegistry = AgentRegistry_1 = class AgentRegistry {
    moduleRef;
    logger = new common_1.Logger(AgentRegistry_1.name);
    agents = new Map();
    agentsByType = new Map();
    constructor(moduleRef) {
        this.moduleRef = moduleRef;
    }
    async onModuleInit() {
        await this.registerAgents();
    }
    async registerAgents() {
        const agentClasses = [
            director_agent_1.DirectorAgent,
            code_agent_1.CodeAgent,
        ];
        for (const AgentClass of agentClasses) {
            try {
                const agent = this.moduleRef.get(AgentClass, { strict: false });
                if (agent) {
                    await this.registerAgent(agent);
                }
            }
            catch (error) {
                this.logger.error(`Failed to register agent ${AgentClass.name}`, error);
            }
        }
        this.logger.log(`Registered ${this.agents.size} agents`);
    }
    async registerAgent(agent) {
        await agent.initialize();
        this.agents.set(agent.metadata.id, agent);
        if (!this.agentsByType.has(agent.metadata.type)) {
            this.agentsByType.set(agent.metadata.type, []);
        }
        this.agentsByType.get(agent.metadata.type).push(agent);
        this.logger.log(`Registered agent: ${agent.metadata.name} (${agent.metadata.type})`);
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    getAgentsByType(type) {
        return this.agentsByType.get(type) || [];
    }
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    getDirectorAgent() {
        const directors = this.getAgentsByType(agent_interface_1.AgentType.DIRECTOR);
        return directors[0];
    }
    async findBestAgentForTask(task) {
        const director = this.getDirectorAgent();
        if (director && (await director.canHandle(task))) {
            return director;
        }
        let bestAgent;
        const highestConfidence = 0;
        for (const agent of this.agents.values()) {
            if (agent.metadata.type !== agent_interface_1.AgentType.DIRECTOR) {
                const canHandle = await agent.canHandle(task);
                if (canHandle) {
                    return agent;
                }
            }
        }
        return director;
    }
    getAgentStats() {
        const stats = {
            totalAgents: this.agents.size,
            agentsByType: {},
        };
        for (const [type, agents] of this.agentsByType.entries()) {
            stats.agentsByType[type] = {
                count: agents.length,
                agents: agents.map((a) => ({
                    id: a.metadata.id,
                    name: a.metadata.name,
                    model: a.metadata.model,
                })),
            };
        }
        return stats;
    }
};
exports.AgentRegistry = AgentRegistry;
exports.AgentRegistry = AgentRegistry = AgentRegistry_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.ModuleRef])
], AgentRegistry);
//# sourceMappingURL=agent.registry.js.map