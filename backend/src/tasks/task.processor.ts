import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TasksService } from './tasks.service';
import { LLMService } from '../llm/llm.service';
import { TaskStatus } from './entities/task.entity';
import { TaskGateway } from './task.gateway';
import { AgentsService } from '../agents/agents.service';

@Processor('tasks')
export class TaskProcessor {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private tasksService: TasksService,
    private llmService: LLMService,
    private taskGateway: TaskGateway,
    private agentsService: AgentsService,
  ) {}

  @Process('process-task')
  async handleTask(job: Job<{ taskId: string }>) {
    const { taskId } = job.data;
    this.logger.log(`Processing task: ${taskId}`);

    try {
      // Update task status to processing
      const task = await this.tasksService.updateStatus(
        taskId,
        TaskStatus.PROCESSING,
      );

      // Emit progress
      this.taskGateway.emitTaskProgress(taskId, 10, 'Task processing started');

      // Check if we should use the agent system
      const useAgents = task.metadata?.useAgents !== false;

      if (useAgents) {
        // Use the new agent system
        this.taskGateway.emitTaskProgress(
          taskId,
          20,
          'Selecting appropriate agent',
        );

        try {
          const agentResult = await this.agentsService.processTask(task);

          this.taskGateway.emitTaskProgress(
            taskId,
            90,
            'Agent processing complete',
          );

          // Update task with agent results
          await this.tasksService.update(taskId, {
            status: agentResult.success
              ? TaskStatus.COMPLETED
              : TaskStatus.FAILED,
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

          this.taskGateway.emitTaskProgress(
            taskId,
            100,
            agentResult.success ? 'Task completed successfully' : 'Task failed',
          );
        } catch (agentError) {
          this.logger.warn(
            `Agent processing failed, falling back to LLM: ${agentError.message}`,
          );
          // Fall back to direct LLM processing
          await this.processWithLLM(task, taskId);
        }
      } else {
        // Use direct LLM processing (legacy mode)
        await this.processWithLLM(task, taskId);
      }

      this.logger.log(`Task ${taskId} completed`);
    } catch (error) {
      this.logger.error(`Task ${taskId} failed: ${error.message}`, error.stack);

      await this.tasksService.update(taskId, {
        status: TaskStatus.FAILED,
        error: error.message,
        metadata: {
          errorStack: error.stack,
          failedAt: new Date(),
        },
      });

      // Throw error to trigger Bull retry mechanism
      throw error;
    }
  }

  private async processWithLLM(task: any, taskId: string) {
    // Legacy LLM processing (from Phase 2)
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

    this.taskGateway.emitTaskProgress(
      taskId,
      30,
      'Analyzing task requirements',
    );

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

    const execution = await this.llmService.generateCompletion(
      executionPrompt,
      {
        temperature: 0.5,
        maxTokens: 600,
      },
    );

    this.taskGateway.emitTaskProgress(taskId, 90, 'Finalizing results');

    // Update task with results
    await this.tasksService.update(taskId, {
      status: TaskStatus.COMPLETED,
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

    this.taskGateway.emitTaskProgress(
      taskId,
      100,
      'Task completed successfully',
    );
  }
}
