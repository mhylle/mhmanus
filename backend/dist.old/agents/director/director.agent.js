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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectorAgent = void 0;
const common_1 = require("@nestjs/common");
const base_agent_1 = require("../base/base.agent");
const agent_interface_1 = require("../interfaces/agent.interface");
const llm_service_1 = require("../../llm/llm.service");
const memory_service_1 = require("../../memory/memory.service");
let DirectorAgent = class DirectorAgent extends base_agent_1.BaseAgent {
    metadata = {
        id: 'director-001',
        name: 'Director',
        type: agent_interface_1.AgentType.DIRECTOR,
        model: 'qwen3:14b',
        description: 'Orchestrates and coordinates other agents to complete complex tasks',
        capabilities: [
            'task decomposition',
            'agent selection',
            'workflow orchestration',
            'result aggregation',
            'quality assurance',
        ],
        maxConcurrentTasks: 5,
    };
    constructor(llmService, memoryService) {
        super(llmService, memoryService);
    }
    async onInitialize() {
        this.logger.log('Director agent ready for orchestration');
    }
    async canHandle(task) {
        const requiresCoordination = task.description.toLowerCase().includes('build') ||
            task.description.toLowerCase().includes('create') ||
            task.description.toLowerCase().includes('implement') ||
            task.description.toLowerCase().includes('develop') ||
            task.description.toLowerCase().includes('analyze and') ||
            task.metadata?.complexity === 'high';
        return requiresCoordination;
    }
    async createPlanWithMemory(task, context, memory) {
        const prompt = this.buildPlanningPromptWithMemory(task, memory);
        const { response, tokensUsed } = await this.callLLM(prompt, context);
        const plan = this.parsePlanFromResponse(response, task);
        await this.logDecision(context, 'task_decomposition', `Decomposed task into ${plan.steps.length} steps${memory ? ' using past experience' : ''}`, plan.confidence);
        context.sharedMemory.set('director_tokens_used', tokensUsed);
        return plan;
    }
    async createPlan(task, context) {
        return this.createPlanWithMemory(task, context, null);
    }
    buildPlanningPromptWithMemory(task, memory) {
        let prompt = `You are a Director Agent responsible for breaking down complex tasks and coordinating other specialized agents.`;
        if (memory && (memory.similar.length > 0 || memory.episodes.length > 0)) {
            prompt += `\n\nBased on past experience:`;
            if (memory.similar.length > 0) {
                prompt += `\n\nSimilar tasks completed successfully:`;
                memory.similar.forEach((similar, i) => {
                    prompt += `\n${i + 1}. ${similar.title} - ${similar.success ? 'Success' : 'Failed'} (${similar.duration}ms)`;
                    if (similar.plan && similar.plan.steps) {
                        prompt += ` - ${similar.plan.steps.length} steps`;
                    }
                });
            }
            if (memory.episodes.length > 0) {
                prompt += `\n\nRelevant past episodes:`;
                memory.episodes.forEach((episode, i) => {
                    const duration = new Date(episode.endTime).getTime() -
                        new Date(episode.startTime).getTime();
                    prompt += `\n${i + 1}. ${episode.taskType} - ${episode.success ? 'Success' : 'Failed'} (${duration}ms)`;
                    if (episode.learnings && episode.learnings.length > 0) {
                        prompt += `\n   Learnings: ${episode.learnings.join(', ')}`;
                    }
                });
            }
            if (memory.patterns.length > 0) {
                prompt += `\n\nKnown patterns:`;
                memory.patterns.forEach((pattern) => {
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
    buildPlanningPrompt(task) {
        return this.buildPlanningPromptWithMemory(task, null);
    }
    parsePlanFromResponse(response, task) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            const steps = parsed.steps.map((step) => ({
                id: step.id,
                description: step.description,
                agentType: this.mapToAgentType(step.agentType),
                dependencies: step.dependencies || [],
                expectedOutput: step.expectedOutput,
                tools: step.tools || [],
            }));
            return {
                steps,
                estimatedDuration: parsed.estimatedTotalMinutes * 60 * 1000,
                requiredAgents: [...new Set(steps.map((s) => s.agentType))],
                confidence: parsed.confidence || 0.7,
            };
        }
        catch (error) {
            this.logger.error('Failed to parse plan from LLM response', error);
            return {
                steps: [
                    {
                        id: 'step-1',
                        description: task.description,
                        agentType: agent_interface_1.AgentType.GENERAL,
                        dependencies: [],
                        expectedOutput: 'Task completed',
                    },
                ],
                estimatedDuration: 300000,
                requiredAgents: [agent_interface_1.AgentType.GENERAL],
                confidence: 0.5,
            };
        }
    }
    mapToAgentType(type) {
        const mapping = {
            CODE: agent_interface_1.AgentType.CODE,
            RESEARCH: agent_interface_1.AgentType.RESEARCH,
            QA: agent_interface_1.AgentType.QA,
            GENERAL: agent_interface_1.AgentType.GENERAL,
        };
        return mapping[type.toUpperCase()] || agent_interface_1.AgentType.GENERAL;
    }
    async executePlan(plan, context) {
        const startTime = Date.now();
        const subResults = [];
        let totalTokensUsed = 0;
        this.addEvent(context.trace.spans[context.trace.spans.length - 1], 'orchestration_started', { totalSteps: plan.steps.length });
        for (const step of plan.steps) {
            const stepResult = await this.simulateStepExecution(step, context);
            subResults.push(stepResult);
            totalTokensUsed += stepResult.tokensUsed;
            context.sharedMemory.set(`step_${step.id}_result`, stepResult);
        }
        const aggregatedResult = await this.aggregateResults(subResults, plan, context);
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
    async simulateStepExecution(step, context) {
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
            duration: Math.random() * 5000 + 1000,
        };
    }
    async aggregateResults(subResults, plan, context) {
        const successfulResults = subResults.filter((r) => r.success);
        if (successfulResults.length === 0) {
            return {
                output: null,
                reasoning: 'All steps failed',
                additionalTokens: 0,
            };
        }
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
};
exports.DirectorAgent = DirectorAgent;
exports.DirectorAgent = DirectorAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LLMService, memory_service_1.MemoryService])
], DirectorAgent);
//# sourceMappingURL=director.agent.js.map