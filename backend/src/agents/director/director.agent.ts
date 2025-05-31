import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseAgent } from '../base/base.agent';
import { Task } from '../../tasks/entities/task.entity';
import {
  AgentMetadata,
  AgentType,
  AgentContext,
  Plan,
  PlanStep,
  AgentResult,
} from '../interfaces/agent.interface';
import { LLMService } from '../../llm/llm.service';
import { MemoryService } from '../../memory/memory.service';

@Injectable()
export class DirectorAgent extends BaseAgent {
  metadata: AgentMetadata = {
    id: 'director-001',
    name: 'Director',
    type: AgentType.DIRECTOR,
    model: 'qwen3:14b',
    description:
      'Orchestrates and coordinates other agents to complete complex tasks',
    capabilities: [
      'task decomposition',
      'agent selection',
      'workflow orchestration',
      'result aggregation',
      'quality assurance',
    ],
    maxConcurrentTasks: 5,
  };

  constructor(
    llmService: LLMService,
    memoryService: MemoryService,
    eventEmitter: EventEmitter2,
  ) {
    super(llmService, memoryService, eventEmitter);
  }

  protected async onInitialize(): Promise<void> {
    // Director-specific initialization
    this.logger.log('Director agent ready for orchestration');
  }

  async canHandle(task: Task): Promise<boolean> {
    // Director can handle any task that requires coordination
    const requiresCoordination =
      task.description.toLowerCase().includes('build') ||
      task.description.toLowerCase().includes('create') ||
      task.description.toLowerCase().includes('implement') ||
      task.description.toLowerCase().includes('develop') ||
      task.description.toLowerCase().includes('analyze and') ||
      task.metadata?.complexity === 'high';

    return requiresCoordination;
  }

  protected async createPlanWithMemory(
    task: Task,
    context: AgentContext,
    memory: any,
  ): Promise<Plan> {
    const prompt = this.buildPlanningPromptWithMemory(task, memory);
    const { response, tokensUsed } = await this.callLLM(prompt, context);

    // Parse the LLM response to extract plan
    const plan = this.parsePlanFromResponse(response, task);

    await this.logDecision(
      context,
      'task_decomposition',
      `Decomposed task into ${plan.steps.length} steps${memory ? ' using past experience' : ''}`,
      plan.confidence,
    );

    context.sharedMemory.set('director_tokens_used', tokensUsed);

    return plan;
  }

  protected async createPlan(task: Task, context: AgentContext): Promise<Plan> {
    return this.createPlanWithMemory(task, context, null);
  }

  private buildPlanningPromptWithMemory(task: Task, memory: any): string {
    let prompt = `You are a Director Agent responsible for breaking down complex tasks and coordinating other specialized agents.`;

    // Add memory context if available
    if (memory && (memory.similar.length > 0 || memory.episodes.length > 0)) {
      prompt += `\n\nBased on past experience:`;

      if (memory.similar.length > 0) {
        prompt += `\n\nSimilar tasks completed successfully:`;
        memory.similar.forEach((similar: any, i: number) => {
          prompt += `\n${i + 1}. ${similar.title} - ${similar.success ? 'Success' : 'Failed'} (${similar.duration}ms)`;
          if (similar.plan && similar.plan.steps) {
            prompt += ` - ${similar.plan.steps.length} steps`;
          }
        });
      }

      if (memory.episodes.length > 0) {
        prompt += `\n\nRelevant past episodes:`;
        memory.episodes.forEach((episode: any, i: number) => {
          const duration =
            new Date(episode.endTime).getTime() -
            new Date(episode.startTime).getTime();
          prompt += `\n${i + 1}. ${episode.taskType} - ${episode.success ? 'Success' : 'Failed'} (${duration}ms)`;
          if (episode.learnings && episode.learnings.length > 0) {
            prompt += `\n   Learnings: ${episode.learnings.join(', ')}`;
          }
        });
      }

      if (memory.patterns.length > 0) {
        prompt += `\n\nKnown patterns:`;
        memory.patterns.forEach((pattern: any) => {
          prompt += `\n- ${pattern.description} (${pattern.successRate * 100}% success rate)`;
        });
      }

      prompt += `\n\nConsider these past experiences when planning the current task.`;
    }

    prompt += `

Task: ${task.title}
Description: ${task.description}
Priority: ${task.priority}
Context: ${JSON.stringify(task.metadata || {})}

Available agent types:
- CODE: Handles software development, code generation, refactoring
- RESEARCH: Gathers information, analyzes documentation, finds solutions
- QA: Tests code, validates results, ensures quality
- GENERAL: Handles general-purpose tasks

Please analyze this task and create a detailed execution plan. For each step, specify:
1. A clear description of what needs to be done
2. Which agent type should handle it
3. Any dependencies on previous steps
4. Expected output

Respond in the following JSON format:
{
  "analysis": "Brief analysis of the task",
  "steps": [
    {
      "id": "step-1",
      "description": "Clear description",
      "agentType": "CODE|RESEARCH|QA|GENERAL",
      "dependencies": [],
      "expectedOutput": "What this step should produce",
      "estimatedMinutes": 5
    }
  ],
  "estimatedTotalMinutes": 30,
  "confidence": 0.85,
  "reasoning": "Explanation of the approach"
}`;

    return prompt;
  }

  private buildPlanningPrompt(task: Task): string {
    return this.buildPlanningPromptWithMemory(task, null);
  }

  private parsePlanFromResponse(response: string, task: Task): Plan {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const steps: PlanStep[] = parsed.steps.map((step: any) => ({
        id: step.id,
        description: step.description,
        agentType: this.mapToAgentType(step.agentType),
        dependencies: step.dependencies || [],
        expectedOutput: step.expectedOutput,
        tools: step.tools || [],
      }));

      return {
        steps,
        estimatedDuration: parsed.estimatedTotalMinutes * 60 * 1000, // Convert to ms
        requiredAgents: [...new Set(steps.map((s) => s.agentType))],
        confidence: parsed.confidence || 0.7,
      };
    } catch (error) {
      this.logger.error('Failed to parse plan from LLM response', error);

      // Fallback to simple plan
      return {
        steps: [
          {
            id: 'step-1',
            description: task.description,
            agentType: AgentType.GENERAL,
            dependencies: [],
            expectedOutput: 'Task completed',
          },
        ],
        estimatedDuration: 300000, // 5 minutes
        requiredAgents: [AgentType.GENERAL],
        confidence: 0.5,
      };
    }
  }

  private mapToAgentType(type: string): AgentType {
    const mapping: Record<string, AgentType> = {
      CODE: AgentType.CODE,
      RESEARCH: AgentType.RESEARCH,
      QA: AgentType.QA,
      GENERAL: AgentType.GENERAL,
    };

    return mapping[type.toUpperCase()] || AgentType.GENERAL;
  }

  protected async executePlan(
    plan: Plan,
    context: AgentContext,
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const subResults: AgentResult[] = [];
    let totalTokensUsed = 0;

    this.addEvent(
      context.trace.spans[context.trace.spans.length - 1],
      'orchestration_started',
      { totalSteps: plan.steps.length },
    );

    // For now, simulate execution - in real implementation, this would
    // delegate to actual specialist agents
    for (const step of plan.steps) {
      const stepResult = await this.simulateStepExecution(step, context);
      subResults.push(stepResult);
      totalTokensUsed += stepResult.tokensUsed;

      // Check dependencies and update context
      context.sharedMemory.set(`step_${step.id}_result`, stepResult);
    }

    // Aggregate results
    const aggregatedResult = await this.aggregateResults(
      subResults,
      plan,
      context,
    );
    totalTokensUsed += aggregatedResult.additionalTokens;

    return {
      success: subResults.every((r) => r.success),
      output: aggregatedResult.output,
      reasoning: aggregatedResult.reasoning,
      tokensUsed: totalTokensUsed,
      duration: Date.now() - startTime,
      subResults,
    };
  }

  private async simulateStepExecution(
    step: PlanStep,
    context: AgentContext,
  ): Promise<AgentResult> {
    // In real implementation, this would dispatch to actual agents
    // For now, simulate with LLM
    const prompt = `Simulate execution of the following step:
Step: ${step.description}
Agent Type: ${step.agentType}
Expected Output: ${step.expectedOutput}

Provide a realistic simulation of what this step would produce.`;

    const { response, tokensUsed } = await this.callLLM(prompt, context);

    return {
      success: true,
      output: response,
      reasoning: `Simulated execution by ${step.agentType} agent`,
      tokensUsed,
      duration: Math.random() * 5000 + 1000, // 1-6 seconds
    };
  }

  private async aggregateResults(
    subResults: AgentResult[],
    plan: Plan,
    context: AgentContext,
  ): Promise<{ output: any; reasoning: string; additionalTokens: number }> {
    const successfulResults = subResults.filter((r) => r.success);

    if (successfulResults.length === 0) {
      return {
        output: null,
        reasoning: 'All steps failed',
        additionalTokens: 0,
      };
    }

    // Use LLM to create a coherent summary
    const prompt = `Aggregate the following results into a coherent summary:

${subResults.map((r, i) => `Step ${i + 1}: ${r.output}`).join('\n\n')}

Create a unified result that combines all successful outputs.`;

    const { response, tokensUsed } = await this.callLLM(prompt, context);

    return {
      output: response,
      reasoning: `Successfully completed ${successfulResults.length}/${plan.steps.length} steps`,
      additionalTokens: tokensUsed,
    };
  }
}
