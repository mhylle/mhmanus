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
var TaskProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const tasks_service_1 = require("./tasks.service");
const llm_service_1 = require("../llm/llm.service");
const task_entity_1 = require("./entities/task.entity");
const task_gateway_1 = require("./task.gateway");
const agents_service_1 = require("../agents/agents.service");
let TaskProcessor = TaskProcessor_1 = class TaskProcessor {
    tasksService;
    llmService;
    taskGateway;
    agentsService;
    logger = new common_1.Logger(TaskProcessor_1.name);
    constructor(tasksService, llmService, taskGateway, agentsService) {
        this.tasksService = tasksService;
        this.llmService = llmService;
        this.taskGateway = taskGateway;
        this.agentsService = agentsService;
    }
    async handleTask(job) {
        const { taskId } = job.data;
        this.logger.log(`Processing task: ${taskId}`);
        try {
            const task = await this.tasksService.updateStatus(taskId, task_entity_1.TaskStatus.PROCESSING);
            this.taskGateway.emitTaskProgress(taskId, 10, 'Task processing started');
            const useAgents = task.metadata?.useAgents !== false;
            if (useAgents) {
                this.taskGateway.emitTaskProgress(taskId, 20, 'Selecting appropriate agent');
                try {
                    const agentResult = await this.agentsService.processTask(task);
                    this.taskGateway.emitTaskProgress(taskId, 90, 'Agent processing complete');
                    await this.tasksService.update(taskId, {
                        status: agentResult.success
                            ? task_entity_1.TaskStatus.COMPLETED
                            : task_entity_1.TaskStatus.FAILED,
                        metadata: {
                            ...task.metadata,
                            agentMetadata: agentResult.metadata,
                            tokensUsed: agentResult.tokensUsed,
                            processingDuration: agentResult.duration,
                        },
                        result: {
                            output: agentResult.output,
                            reasoning: agentResult.reasoning,
                            completedAt: new Date(),
                            success: agentResult.success,
                            subResults: agentResult.subResults,
                        },
                    });
                    this.taskGateway.emitTaskProgress(taskId, 100, agentResult.success ? 'Task completed successfully' : 'Task failed');
                }
                catch (agentError) {
                    this.logger.warn(`Agent processing failed, falling back to LLM: ${agentError.message}`);
                    await this.processWithLLM(task, taskId);
                }
            }
            else {
                await this.processWithLLM(task, taskId);
            }
            this.logger.log(`Task ${taskId} completed`);
        }
        catch (error) {
            this.logger.error(`Task ${taskId} failed: ${error.message}`, error.stack);
            await this.tasksService.update(taskId, {
                status: task_entity_1.TaskStatus.FAILED,
                error: error.message,
                metadata: {
                    errorStack: error.stack,
                    failedAt: new Date(),
                },
            });
            throw error;
        }
    }
    async processWithLLM(task, taskId) {
        const analysisPrompt = `
      Analyze the following task and provide a structured response:
      Title: ${task.title}
      Description: ${task.description}
      
      Please provide:
      1. Task type classification
      2. Required steps to complete
      3. Estimated complexity (simple/medium/complex)
      4. Suggested approach
    `;
        this.taskGateway.emitTaskProgress(taskId, 30, 'Analyzing task requirements');
        const analysis = await this.llmService.generateCompletion(analysisPrompt, {
            temperature: 0.3,
            maxTokens: 500,
        });
        this.taskGateway.emitTaskProgress(taskId, 50, 'Task analysis complete');
        const executionPrompt = `
      Based on this task: "${task.title}"
      Description: ${task.description}
      
      Provide a simulated execution result. Include:
      1. Actions that would be taken
      2. Expected outcome
      3. Any potential issues or considerations
    `;
        this.taskGateway.emitTaskProgress(taskId, 70, 'Executing task');
        const execution = await this.llmService.generateCompletion(executionPrompt, {
            temperature: 0.5,
            maxTokens: 600,
        });
        this.taskGateway.emitTaskProgress(taskId, 90, 'Finalizing results');
        await this.tasksService.update(taskId, {
            status: task_entity_1.TaskStatus.COMPLETED,
            metadata: {
                ...task.metadata,
                analysis: analysis.content,
                llmModel: analysis.model,
                processingTime: analysis.metadata?.duration,
            },
            result: {
                execution: execution.content,
                completedAt: new Date(),
                success: true,
            },
        });
        this.taskGateway.emitTaskProgress(taskId, 100, 'Task completed successfully');
    }
};
exports.TaskProcessor = TaskProcessor;
__decorate([
    (0, bull_1.Process)('process-task'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskProcessor.prototype, "handleTask", null);
exports.TaskProcessor = TaskProcessor = TaskProcessor_1 = __decorate([
    (0, bull_1.Processor)('tasks'),
    __metadata("design:paramtypes", [tasks_service_1.TasksService,
        llm_service_1.LLMService,
        task_gateway_1.TaskGateway,
        agents_service_1.AgentsService])
], TaskProcessor);
//# sourceMappingURL=task.processor.js.map