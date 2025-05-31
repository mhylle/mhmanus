import { BaseAgent } from '../base/base.agent';
import { Task } from '../../tasks/entities/task.entity';
import { AgentMetadata, AgentContext, Plan, AgentResult } from '../interfaces/agent.interface';
import { LLMService } from '../../llm/llm.service';
import { MemoryService } from '../../memory/memory.service';
export declare class DirectorAgent extends BaseAgent {
    metadata: AgentMetadata;
    constructor(llmService: LLMService, memoryService: MemoryService);
    protected onInitialize(): Promise<void>;
    canHandle(task: Task): Promise<boolean>;
    protected createPlanWithMemory(task: Task, context: AgentContext, memory: any): Promise<Plan>;
    protected createPlan(task: Task, context: AgentContext): Promise<Plan>;
    private buildPlanningPromptWithMemory;
    private buildPlanningPrompt;
    private parsePlanFromResponse;
    private mapToAgentType;
    protected executePlan(plan: Plan, context: AgentContext): Promise<AgentResult>;
    private simulateStepExecution;
    private aggregateResults;
}
