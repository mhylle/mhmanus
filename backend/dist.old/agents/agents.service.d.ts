import { Task } from '../tasks/entities/task.entity';
import { AgentRegistry } from './agent.registry';
import { AgentCommunicationBus } from './communication/agent-communication.bus';
import { MemoryService } from '../memory/memory.service';
import { ExecutionTrace, AgentResult } from './interfaces/agent.interface';
export declare class AgentsService {
    private readonly agentRegistry;
    private readonly communicationBus;
    private readonly memoryService;
    private readonly logger;
    constructor(agentRegistry: AgentRegistry, communicationBus: AgentCommunicationBus, memoryService: MemoryService);
    processTask(task: Task): Promise<AgentResult>;
    private createContext;
    getAgentStatus(): Promise<{
        registry: Record<string, any>;
        communication: Record<string, any>;
        activeAgents: string[];
    }>;
    testAgentCommunication(): Promise<{
        success: boolean;
        activeAgents: string[];
    }>;
    getExecutionTrace(sessionId: string): Promise<ExecutionTrace | null>;
}
