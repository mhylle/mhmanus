import { AgentsService } from './agents.service';
import { AgentRegistry } from './agent.registry';
export declare class AgentsController {
    private readonly agentsService;
    private readonly agentRegistry;
    constructor(agentsService: AgentsService, agentRegistry: AgentRegistry);
    getAllAgents(): Promise<{
        id: string;
        name: string;
        type: import("./interfaces/agent.interface").AgentType;
        model: string;
        description: string;
        capabilities: string[];
    }[]>;
    getAgentStatus(): Promise<{
        registry: Record<string, any>;
        communication: Record<string, any>;
        activeAgents: string[];
    }>;
    getRegistry(): Promise<Record<string, any>>;
    getAgent(agentId: string): Promise<{
        error: string;
        id?: undefined;
        name?: undefined;
        type?: undefined;
        model?: undefined;
        description?: undefined;
        capabilities?: undefined;
        maxConcurrentTasks?: undefined;
    } | {
        id: string;
        name: string;
        type: import("./interfaces/agent.interface").AgentType;
        model: string;
        description: string;
        capabilities: string[];
        maxConcurrentTasks: number;
        error?: undefined;
    }>;
    testCommunication(): Promise<{
        success: boolean;
        activeAgents: string[];
    }>;
    getExecutionTrace(sessionId: string): Promise<import("./interfaces/agent.interface").ExecutionTrace | {
        error: string;
    }>;
}
