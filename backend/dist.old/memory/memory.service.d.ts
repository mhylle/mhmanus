import { OnModuleInit } from '@nestjs/common';
import { IMemoryService, MemoryStats, TaskMemory, Episode } from './interfaces/memory.interface';
import { AgentContext } from '../agents/interfaces/agent.interface';
import { ShortTermMemoryService } from './services/short-term-memory.service';
import { LongTermMemoryService } from './services/long-term-memory.service';
import { SemanticMemoryService } from './services/semantic-memory.service';
import { EpisodicMemoryService } from './services/episodic-memory.service';
export declare class MemoryService implements IMemoryService, OnModuleInit {
    readonly shortTerm: ShortTermMemoryService;
    readonly longTerm: LongTermMemoryService;
    readonly semantic: SemanticMemoryService;
    readonly episodic: EpisodicMemoryService;
    private readonly logger;
    constructor(shortTerm: ShortTermMemoryService, longTerm: LongTermMemoryService, semantic: SemanticMemoryService, episodic: EpisodicMemoryService);
    onModuleInit(): Promise<void>;
    rememberTask(task: any, result: any, context: AgentContext): Promise<void>;
    recallSimilarTasks(task: any, limit?: number): Promise<{
        similar: TaskMemory[];
        episodes: Episode[];
        patterns: any[];
    }>;
    getAgentMemory(agentId: string): Promise<{
        context: AgentContext | null;
        recentTasks: TaskMemory[];
        patterns: any[];
    }>;
    getMemoryStats(): Promise<MemoryStats>;
    learnFromSuccess(taskId: string): Promise<void>;
    private classifyTaskType;
    private extractStepsFromTrace;
    private extractLearnings;
    private extractPatternFromTask;
    private performHealthCheck;
}
