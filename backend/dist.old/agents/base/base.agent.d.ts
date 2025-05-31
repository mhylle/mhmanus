import { Logger } from '@nestjs/common';
import { Task } from '../../tasks/entities/task.entity';
import { LLMService } from '../../llm/llm.service';
import { MemoryService } from '../../memory/memory.service';
import { IAgent, AgentMetadata, AgentContext, Plan, AgentResult, TraceSpan } from '../interfaces/agent.interface';
export declare abstract class BaseAgent implements IAgent {
    protected readonly llmService: LLMService;
    protected readonly memoryService?: MemoryService | undefined;
    protected readonly logger: Logger;
    protected isInitialized: boolean;
    abstract metadata: AgentMetadata;
    constructor(llmService: LLMService, memoryService?: MemoryService | undefined);
    initialize(): Promise<void>;
    protected abstract onInitialize(): Promise<void>;
    abstract canHandle(task: Task): Promise<boolean>;
    plan(task: Task, context: AgentContext): Promise<Plan>;
    protected createPlanWithMemory(task: Task, context: AgentContext, memory: any): Promise<Plan>;
    protected abstract createPlan(task: Task, context: AgentContext): Promise<Plan>;
    execute(plan: Plan, context: AgentContext): Promise<AgentResult>;
    protected abstract executePlan(plan: Plan, context: AgentContext): Promise<AgentResult>;
    validate(result: AgentResult): Promise<boolean>;
    protected createSpan(operation: string, context: AgentContext): TraceSpan;
    protected endSpan(span: TraceSpan): void;
    protected addEvent(span: TraceSpan, name: string, attributes?: Record<string, any>): void;
    protected callLLM(prompt: string, context: AgentContext): Promise<{
        response: string;
        tokensUsed: number;
    }>;
    protected estimateTokens(text: string): number;
    protected logDecision(context: AgentContext, decision: string, reasoning: string, confidence: number): Promise<void>;
}
