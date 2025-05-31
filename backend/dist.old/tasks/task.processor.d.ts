import { Job } from 'bull';
import { TasksService } from './tasks.service';
import { LLMService } from '../llm/llm.service';
import { TaskGateway } from './task.gateway';
import { AgentsService } from '../agents/agents.service';
export declare class TaskProcessor {
    private tasksService;
    private llmService;
    private taskGateway;
    private agentsService;
    private readonly logger;
    constructor(tasksService: TasksService, llmService: LLMService, taskGateway: TaskGateway, agentsService: AgentsService);
    handleTask(job: Job<{
        taskId: string;
    }>): Promise<void>;
    private processWithLLM;
}
