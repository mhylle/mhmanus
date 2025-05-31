import { Redis } from 'ioredis';
import { IShortTermMemory, Interaction } from '../interfaces/memory.interface';
import { AgentContext } from '../../agents/interfaces/agent.interface';
export declare class ShortTermMemoryService implements IShortTermMemory {
    private readonly redis;
    private readonly logger;
    private readonly contextPrefix;
    private readonly interactionPrefix;
    private readonly interactionListKey;
    private readonly defaultTTL;
    constructor(redis: Redis);
    store(key: string, value: any, ttl?: number): Promise<void>;
    retrieve(key: string): Promise<any | null>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    clear(): Promise<void>;
    setContext(agentId: string, context: AgentContext): Promise<void>;
    getContext(agentId: string): Promise<AgentContext | null>;
    updateContext(agentId: string, updates: Partial<AgentContext>): Promise<void>;
    addInteraction(interaction: Interaction): Promise<void>;
    getRecentInteractions(limit?: number): Promise<Interaction[]>;
    getMemoryStats(): Promise<{
        contextCount: number;
        interactionCount: number;
        memoryInfo: any;
    }>;
    extendTTL(key: string, ttl: number): Promise<void>;
    getActiveAgents(): Promise<string[]>;
}
