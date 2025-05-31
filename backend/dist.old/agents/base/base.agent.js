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
exports.BaseAgent = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const llm_service_1 = require("../../llm/llm.service");
const memory_service_1 = require("../../memory/memory.service");
let BaseAgent = class BaseAgent {
    llmService;
    memoryService;
    logger;
    isInitialized = false;
    constructor(llmService, memoryService) {
        this.llmService = llmService;
        this.memoryService = memoryService;
        this.logger = new common_1.Logger(this.constructor.name);
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        this.logger.log(`Initializing agent: ${this.metadata.name}`);
        await this.onInitialize();
        this.isInitialized = true;
        this.logger.log(`Agent initialized: ${this.metadata.name}`);
    }
    async plan(task, context) {
        const span = this.createSpan('plan', context);
        try {
            this.addEvent(span, 'planning_started', { taskId: task.id });
            let similarTasksInfo = null;
            if (this.memoryService) {
                try {
                    const similar = await this.memoryService.recallSimilarTasks(task, 3);
                    if (similar.similar.length > 0 || similar.episodes.length > 0) {
                        similarTasksInfo = similar;
                        this.addEvent(span, 'memory_recall', {
                            similarTasks: similar.similar.length,
                            episodes: similar.episodes.length,
                            patterns: similar.patterns.length,
                        });
                    }
                }
                catch (error) {
                    this.logger.warn('Failed to recall similar tasks from memory', error);
                }
            }
            const plan = await this.createPlanWithMemory(task, context, similarTasksInfo);
            this.addEvent(span, 'planning_completed', {
                steps: plan.steps.length,
                confidence: plan.confidence,
                usedMemory: !!similarTasksInfo,
            });
            return plan;
        }
        catch (error) {
            this.addEvent(span, 'planning_failed', { error: error.message });
            throw error;
        }
        finally {
            this.endSpan(span);
        }
    }
    async createPlanWithMemory(task, context, memory) {
        return this.createPlan(task, context);
    }
    async execute(plan, context) {
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
            if (this.memoryService && context) {
                try {
                    await this.memoryService.shortTerm.setContext(this.metadata.id, context);
                }
                catch (error) {
                    this.logger.warn('Failed to store context in memory', error);
                }
            }
            return {
                ...result,
                duration,
            };
        }
        catch (error) {
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
        }
        finally {
            this.endSpan(span);
        }
    }
    async validate(result) {
        return result.success && result.output !== null;
    }
    createSpan(operation, context) {
        const span = {
            spanId: (0, uuid_1.v4)(),
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
    endSpan(span) {
        span.endTime = new Date();
    }
    addEvent(span, name, attributes) {
        span.events.push({
            timestamp: new Date(),
            name,
            attributes,
        });
    }
    async callLLM(prompt, context) {
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
        }
        finally {
            this.endSpan(span);
        }
    }
    estimateTokens(text) {
        return Math.ceil(text.length / 4);
    }
    async logDecision(context, decision, reasoning, confidence) {
        this.logger.debug(`[${this.metadata.name}] Decision: ${decision}`);
        this.logger.debug(`[${this.metadata.name}] Reasoning: ${reasoning}`);
        this.logger.debug(`[${this.metadata.name}] Confidence: ${confidence}`);
        context.sharedMemory.set(`${this.metadata.id}_last_decision`, {
            decision,
            reasoning,
            confidence,
            timestamp: new Date(),
        });
    }
};
exports.BaseAgent = BaseAgent;
exports.BaseAgent = BaseAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LLMService,
        memory_service_1.MemoryService])
], BaseAgent);
//# sourceMappingURL=base.agent.js.map