import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '../../tasks/entities/task.entity';
import { LLMService } from '../../llm/llm.service';
import { MemoryService } from '../../memory/memory.service';
import {
  IAgent,
  AgentMetadata,
  AgentContext,
  Plan,
  AgentResult,
  TraceSpan,
  TraceEvent,
  AgentType,
} from '../interfaces/agent.interface';

@Injectable()
export abstract class BaseAgent implements IAgent {
  protected readonly logger: Logger;
  protected isInitialized = false;

  abstract metadata: AgentMetadata;

  constructor(
    protected readonly llmService: LLMService,
    protected readonly memoryService?: MemoryService,
    // TODO: Add tool registry when implemented
    // TODO: Add telemetry service when implemented
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.log(`Initializing agent: ${this.metadata.name}`);
    await this.onInitialize();
    this.isInitialized = true;
    this.logger.log(`Agent initialized: ${this.metadata.name}`);
  }

  protected abstract onInitialize(): Promise<void>;

  abstract canHandle(task: Task): Promise<boolean>;

  async plan(task: Task, context: AgentContext): Promise<Plan> {
    const span = this.createSpan('plan', context);

    try {
      this.addEvent(span, 'planning_started', { taskId: task.id });

      // Check memory for similar tasks
      let similarTasksInfo = null;
      if (this.memoryService) {
        try {
          const similar = await this.memoryService.recallSimilarTasks(task, 3);
          if (similar.similar.length > 0 || similar.episodes.length > 0) {
            similarTasksInfo = similar as any;
            this.addEvent(span, 'memory_recall', {
              similarTasks: similar.similar.length,
              episodes: similar.episodes.length,
              patterns: similar.patterns.length,
            });
          }
        } catch (error) {
          this.logger.warn('Failed to recall similar tasks from memory', error);
        }
      }

      // Pass memory context to planning
      const plan = await this.createPlanWithMemory(
        task,
        context,
        similarTasksInfo,
      );

      this.addEvent(span, 'planning_completed', {
        steps: plan.steps.length,
        confidence: plan.confidence,
        usedMemory: !!similarTasksInfo,
      });

      return plan;
    } catch (error) {
      this.addEvent(span, 'planning_failed', { error: error.message });
      throw error;
    } finally {
      this.endSpan(span);
    }
  }

  protected async createPlanWithMemory(
    task: Task,
    context: AgentContext,
    memory: any,
  ): Promise<Plan> {
    // Default implementation just calls createPlan
    // Subclasses can override to use memory
    return this.createPlan(task, context);
  }

  protected abstract createPlan(
    task: Task,
    context: AgentContext,
  ): Promise<Plan>;

  async execute(plan: Plan, context: AgentContext): Promise<AgentResult> {
    const span = this.createSpan('execute', context);
    const startTime = Date.now();
    let tokensUsed = 0;

    try {
      this.addEvent(span, 'execution_started', {
        planSteps: plan.steps.length,
      });

      const result = await this.executePlan(plan, context);
      tokensUsed = result.tokensUsed || 0;

      const duration = Date.now() - startTime;

      this.addEvent(span, 'execution_completed', {
        success: result.success,
        duration,
        tokensUsed,
      });

      // Store in short-term memory if available
      if (this.memoryService && context) {
        try {
          await this.memoryService.shortTerm.setContext(
            this.metadata.id,
            context,
          );
        } catch (error) {
          this.logger.warn('Failed to store context in memory', error);
        }
      }

      return {
        ...result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.addEvent(span, 'execution_failed', {
        error: error.message,
        duration,
      });

      return {
        success: false,
        output: null,
        reasoning: `Execution failed: ${error.message}`,
        tokensUsed,
        duration,
      };
    } finally {
      this.endSpan(span);
    }
  }

  protected abstract executePlan(
    plan: Plan,
    context: AgentContext,
  ): Promise<AgentResult>;

  async validate(result: AgentResult): Promise<boolean> {
    // Basic validation - can be overridden by specific agents
    return result.success && result.output !== null;
  }

  protected createSpan(operation: string, context: AgentContext): TraceSpan {
    const span: TraceSpan = {
      spanId: uuidv4(),
      parentSpanId: context.trace.spans[context.trace.spans.length - 1]?.spanId,
      agentId: this.metadata.id,
      operation: `${this.metadata.name}.${operation}`,
      startTime: new Date(),
      attributes: {
        agentType: this.metadata.type,
        taskId: context.taskId,
      },
      events: [],
    };

    context.trace.spans.push(span);
    return span;
  }

  protected endSpan(span: TraceSpan): void {
    span.endTime = new Date();
  }

  protected addEvent(
    span: TraceSpan,
    name: string,
    attributes?: Record<string, any>,
  ): void {
    span.events.push({
      timestamp: new Date(),
      name,
      attributes,
    });
  }

  protected async callLLM(
    prompt: string,
    context: AgentContext,
  ): Promise<{
    response: string;
    tokensUsed: number;
  }> {
    const span = this.createSpan('llm_call', context);

    try {
      this.addEvent(span, 'llm_request', {
        model: this.metadata.model,
        promptLength: prompt.length,
      });

      const startTime = Date.now();
      const response = await this.llmService.generateCompletion(prompt, {
        temperature: 0.7,
        maxTokens: 4096,
      });

      const duration = Date.now() - startTime;
      const responseText = response.content;
      const tokensUsed = this.estimateTokens(prompt + responseText);

      this.addEvent(span, 'llm_response', {
        responseLength: responseText.length,
        duration,
        tokensUsed,
      });

      return { response: responseText, tokensUsed };
    } finally {
      this.endSpan(span);
    }
  }

  protected estimateTokens(text: string): number {
    // Simple estimation: ~1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  protected async logDecision(
    context: AgentContext,
    decision: string,
    reasoning: string,
    confidence: number,
  ): Promise<void> {
    this.logger.debug(`[${this.metadata.name}] Decision: ${decision}`);
    this.logger.debug(`[${this.metadata.name}] Reasoning: ${reasoning}`);
    this.logger.debug(`[${this.metadata.name}] Confidence: ${confidence}`);

    // Store in context for tracing
    context.sharedMemory.set(`${this.metadata.id}_last_decision`, {
      decision,
      reasoning,
      confidence,
      timestamp: new Date(),
    });
  }
}
