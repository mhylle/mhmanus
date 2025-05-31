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
exports.CodeAgent = void 0;
const common_1 = require("@nestjs/common");
const base_agent_1 = require("../base/base.agent");
const llm_service_1 = require("../../llm/llm.service");
const memory_service_1 = require("../../memory/memory.service");
const agent_interface_1 = require("../interfaces/agent.interface");
let CodeAgent = class CodeAgent extends base_agent_1.BaseAgent {
    id = 'code-001';
    name = 'Code Agent';
    description = 'Autonomous code generation with memory integration';
    capabilities = [
        agent_interface_1.AgentCapability.CODE_GENERATION,
        agent_interface_1.AgentCapability.TESTING,
        agent_interface_1.AgentCapability.PATTERN_LEARNING,
    ];
    metadata = {
        id: 'code-001',
        name: 'Code Agent',
        type: agent_interface_1.AgentType.CODE,
        model: 'ollama',
        description: 'Autonomous code generation with memory integration',
        capabilities: ['code_generation', 'testing', 'pattern_learning'],
        maxConcurrentTasks: 3,
    };
    constructor(llmService, memoryService) {
        super(llmService, memoryService);
    }
    async onInitialize() {
        this.logger.log('Code Agent initialized');
    }
    async canHandle(task) {
        const keywords = [
            'code',
            'implement',
            'create',
            'generate',
            'build',
            'develop',
            'function',
            'class',
            'interface',
        ];
        const taskText = `${task.title} ${task.description}`.toLowerCase();
        return keywords.some((keyword) => taskText.includes(keyword));
    }
    async createPlan(task, context) {
        const agentPlan = await this.generateAgentPlan(task, context);
        return {
            steps: agentPlan.steps.map((step, index) => ({
                id: `step-${index}`,
                description: step.description,
                agentType: agent_interface_1.AgentType.CODE,
                dependencies: step.dependencies.map((d) => `step-${d}`),
                expectedOutput: step.action,
                tools: ['llm', 'memory'],
            })),
            estimatedDuration: agentPlan.estimatedTokens * 10,
            requiredAgents: [agent_interface_1.AgentType.CODE],
            confidence: agentPlan.confidence,
        };
    }
    async executePlan(plan, context) {
        const agentPlan = {
            agentId: this.id,
            taskId: context.taskId,
            steps: plan.steps.map((step) => ({
                action: step.expectedOutput,
                description: step.description,
                input: {},
                dependencies: [],
            })),
            estimatedTokens: Math.floor(plan.estimatedDuration / 10),
            confidence: plan.confidence,
        };
        const result = await this.executeAgentPlan(agentPlan, context);
        return {
            success: result.success,
            output: result.output,
            reasoning: 'Code generation completed',
            tokensUsed: result.tokensUsed,
            duration: result.duration,
        };
    }
    async generateAgentPlan(task, context) {
        this.logger.log(`Code Agent planning for task: ${task.title}`);
        const memory = await this.getRelevantMemory(task, context);
        const prompt = this.buildCodePlanningPrompt(task, memory);
        const response = await this.llmService.generateCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are a code generation agent that creates high-quality code based on past patterns.',
                },
                { role: 'user', content: prompt },
            ],
        });
        const planData = this.parseLLMResponse(response.content);
        const plan = {
            agentId: this.id,
            taskId: task.id,
            steps: this.generateCodeSteps(planData, memory),
            estimatedTokens: planData.estimatedTokens || 2000,
            confidence: this.calculateConfidence(planData, memory),
        };
        context.decisions = context.decisions || [];
        context.decisions.push({
            agentId: this.id,
            action: 'plan_code_generation',
            description: `Plan code generation for ${task.title}`,
            reasoning: `Generated ${plan.steps.length} steps based on ${memory.codeSnippets.length} similar code patterns`,
            confidence: plan.confidence,
            timestamp: new Date(),
        });
        return plan;
    }
    async executeAgentPlan(plan, context) {
        this.logger.log(`Code Agent executing plan for task ${plan.taskId}`);
        const startTime = Date.now();
        context.trace.steps = [];
        const generatedCode = new Map();
        const tests = new Map();
        let totalTokens = 0;
        try {
            for (const step of plan.steps) {
                const stepResult = await this.executeCodeStep(step, context, generatedCode, tests);
                context.trace.steps.push({
                    agentId: this.id,
                    action: step.action,
                    input: step.input,
                    output: stepResult.output,
                    duration: stepResult.duration,
                    tokensUsed: stepResult.tokensUsed,
                    timestamp: new Date(),
                });
                totalTokens += stepResult.tokensUsed || 0;
                if (!stepResult.success) {
                    throw new Error(`Step failed: ${step.action}`);
                }
            }
            const result = {
                success: true,
                output: {
                    files: Array.from(generatedCode.entries()).map(([path, content]) => ({
                        path,
                        content,
                        type: 'code',
                    })),
                    tests: Array.from(tests.entries()).map(([path, content]) => ({
                        path,
                        content,
                        type: 'test',
                    })),
                    summary: `Generated ${generatedCode.size} files and ${tests.size} test files`,
                },
                tokensUsed: totalTokens,
                duration: Date.now() - startTime,
            };
            await this.storeSuccessfulPatterns(plan, result, context);
            return result;
        }
        catch (error) {
            this.logger.error(`Code execution failed: ${error.message}`);
            return {
                success: false,
                output: null,
                error: error.message,
                tokensUsed: totalTokens,
                duration: Date.now() - startTime,
            };
        }
    }
    async executeCodeStep(step, context, generatedCode, tests) {
        const startTime = Date.now();
        switch (step.action) {
            case 'generate_interface':
                return this.generateInterface(step, context, generatedCode);
            case 'generate_implementation':
                return this.generateImplementation(step, context, generatedCode);
            case 'generate_test':
                return this.generateTest(step, context, tests, generatedCode);
            case 'refactor_code':
                return this.refactorCode(step, context, generatedCode);
            case 'apply_pattern':
                return this.applyLearnedPattern(step, context, generatedCode);
            default:
                return {
                    success: false,
                    output: `Unknown action: ${step.action}`,
                    duration: Date.now() - startTime,
                    tokensUsed: 0,
                };
        }
    }
    async generateInterface(step, context, generatedCode) {
        const startTime = Date.now();
        const similarInterfaces = await this.memoryService?.semantic.searchSimilar(`interface ${step.input.name}`, 5);
        const prompt = `Generate a TypeScript interface for ${step.input.name}.
Requirements: ${step.input.requirements}

${similarInterfaces && similarInterfaces.length > 0
            ? `
Similar interfaces from past projects:
${similarInterfaces.map((s) => s.content).join('\n\n')}
`
            : ''}

Follow TypeScript best practices and include proper documentation.`;
        const response = await this.llmService.generateCompletion({
            messages: [
                { role: 'system', content: 'You are an expert TypeScript developer.' },
                { role: 'user', content: prompt },
            ],
        });
        const code = this.extractCode(response.content);
        const filePath = step.input.path || `src/interfaces/${step.input.name}.interface.ts`;
        generatedCode.set(filePath, code);
        if (this.memoryService) {
            await this.memoryService.semantic.storeEmbedding(code, {
                type: 'code',
                source: 'code_agent',
                agentId: this.id,
                taskId: context.taskId,
                tags: ['interface', 'typescript', step.input.name],
                timestamp: new Date(),
            });
        }
        return {
            success: true,
            output: { filePath, linesOfCode: code.split('\n').length },
            duration: Date.now() - startTime,
            tokensUsed: response.usage?.totalTokens || 500,
        };
    }
    async generateImplementation(step, context, generatedCode) {
        const startTime = Date.now();
        const patterns = await this.memoryService?.longTerm.getPatterns('code_generation');
        const similarCode = await this.memoryService?.longTerm.searchCodeSnippets(step.input.description);
        const prompt = `Generate TypeScript implementation for: ${step.input.description}

${step.input.interface
            ? `Interface to implement:
${step.input.interface}`
            : ''}

${patterns && patterns.length > 0
            ? `
Apply these successful patterns:
${patterns.map((p) => `- ${p.description}: ${p.pattern}`).join('\n')}
`
            : ''}

${similarCode && similarCode.length > 0
            ? `
Reference implementations:
${similarCode.map((s) => s.code).join('\n\n---\n\n')}
`
            : ''}

Requirements:
- Follow TypeScript best practices
- Include error handling
- Add appropriate logging
- Make the code testable`;
        const response = await this.llmService.generateCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert TypeScript developer focused on clean, maintainable code.',
                },
                { role: 'user', content: prompt },
            ],
        });
        const code = this.extractCode(response.content);
        const filePath = step.input.path || `src/services/${step.input.name}.service.ts`;
        generatedCode.set(filePath, code);
        if (this.memoryService) {
            await this.memoryService.longTerm.storeCodeSnippet({
                id: `snippet-${Date.now()}`,
                language: 'typescript',
                purpose: step.input.description,
                code,
                tags: ['service', 'implementation', ...(step.input.tags || [])],
                usageCount: 1,
                successRate: 100,
                createdAt: new Date(),
                lastUsed: new Date(),
            });
        }
        return {
            success: true,
            output: { filePath, linesOfCode: code.split('\n').length },
            duration: Date.now() - startTime,
            tokensUsed: response.usage?.totalTokens || 1000,
        };
    }
    async generateTest(step, context, tests, generatedCode) {
        const startTime = Date.now();
        const codeToTest = generatedCode.get(step.input.targetFile) || step.input.code;
        const testPatterns = await this.memoryService?.longTerm.getPatterns('testing');
        const prompt = `Generate comprehensive tests for the following code:

${codeToTest}

${testPatterns && testPatterns.length > 0
            ? `
Apply these successful test patterns:
${testPatterns.map((p) => `- ${p.description}`).join('\n')}
`
            : ''}

Requirements:
- Use Jest/Jasmine for testing
- Include unit tests for all public methods
- Test edge cases and error conditions
- Include mock setup where needed
- Aim for high code coverage`;
        const response = await this.llmService.generateCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at writing comprehensive test suites.',
                },
                { role: 'user', content: prompt },
            ],
        });
        const testCode = this.extractCode(response.content);
        const testPath = step.input.path || step.input.targetFile.replace('.ts', '.spec.ts');
        tests.set(testPath, testCode);
        return {
            success: true,
            output: { testPath, testCount: (testCode.match(/it\(/g) || []).length },
            duration: Date.now() - startTime,
            tokensUsed: response.usage?.totalTokens || 800,
        };
    }
    async refactorCode(step, context, generatedCode) {
        const startTime = Date.now();
        const currentCode = generatedCode.get(step.input.file) || step.input.code;
        const optimizations = await this.memoryService?.longTerm.getPatterns('optimization');
        const prompt = `Refactor the following code for better quality:

${currentCode}

Focus on:
${step.input.improvements?.join('\n') ||
            `
- Readability
- Performance
- Maintainability
- Error handling
- Code reuse`}

${optimizations && optimizations.length > 0
            ? `
Apply these optimization patterns:
${optimizations.map((p) => p.description).join('\n')}
`
            : ''}`;
        const response = await this.llmService.generateCompletion({
            messages: [
                { role: 'system', content: 'You are a code refactoring expert.' },
                { role: 'user', content: prompt },
            ],
        });
        const refactoredCode = this.extractCode(response.content);
        generatedCode.set(step.input.file, refactoredCode);
        return {
            success: true,
            output: {
                file: step.input.file,
                improvements: this.analyzeImprovements(currentCode, refactoredCode),
            },
            duration: Date.now() - startTime,
            tokensUsed: response.usage?.totalTokens || 700,
        };
    }
    async applyLearnedPattern(step, context, generatedCode) {
        const startTime = Date.now();
        const pattern = await this.memoryService?.longTerm.getPatterns(step.input.patternType);
        if (!pattern || pattern.length === 0) {
            return {
                success: false,
                output: `No patterns found for type: ${step.input.patternType}`,
                duration: Date.now() - startTime,
                tokensUsed: 0,
            };
        }
        const bestPattern = pattern.reduce((best, current) => current.successRate > best.successRate ? current : best);
        const prompt = `Apply this pattern to generate code:

Pattern: ${bestPattern.description}
Template: ${bestPattern.pattern}

Context: ${step.input.context}
Requirements: ${step.input.requirements}

Examples of successful usage:
${bestPattern.examples.slice(0, 2).join('\n\n')}`;
        const response = await this.llmService.generateCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'Apply the given pattern precisely while adapting to the specific requirements.',
                },
                { role: 'user', content: prompt },
            ],
        });
        const code = this.extractCode(response.content);
        const filePath = step.input.path || `src/generated/${step.input.name}.ts`;
        generatedCode.set(filePath, code);
        if (this.memoryService) {
            bestPattern.usageCount++;
            bestPattern.lastUsed = new Date();
            await this.memoryService.longTerm.storePattern(bestPattern);
        }
        return {
            success: true,
            output: {
                filePath,
                patternApplied: bestPattern.type,
                confidence: bestPattern.successRate,
            },
            duration: Date.now() - startTime,
            tokensUsed: response.usage?.totalTokens || 600,
        };
    }
    buildCodePlanningPrompt(task, memory) {
        let prompt = `Plan code generation for: ${task.title}
Description: ${task.description}

Break this down into specific code generation steps.`;
        if (memory.codeSnippets.length > 0) {
            prompt += `\n\nRelevant code from past projects:
${memory.codeSnippets.map((s) => `- ${s.purpose}: ${s.language} (${s.successRate}% success)`).join('\n')}`;
        }
        if (memory.patterns.length > 0) {
            prompt += `\n\nSuccessful patterns to consider:
${memory.patterns.map((p) => `- ${p.type}: ${p.description} (${p.usageCount} uses)`).join('\n')}`;
        }
        if (memory.similar.length > 0) {
            prompt += `\n\nSimilar tasks completed:
${memory.similar.map((t) => `- ${t.title}: ${t.success ? 'Success' : 'Failed'} (${t.duration}ms)`).join('\n')}`;
        }
        prompt += `\n\nGenerate a detailed plan with specific steps for code generation, testing, and quality assurance.`;
        return prompt;
    }
    generateCodeSteps(planData, memory) {
        const steps = [];
        if (planData.needsInterface) {
            steps.push({
                action: 'generate_interface',
                description: 'Generate TypeScript interface',
                input: planData.interface,
                dependencies: [],
            });
        }
        if (planData.needsImplementation) {
            steps.push({
                action: 'generate_implementation',
                description: 'Generate implementation code',
                input: planData.implementation,
                dependencies: planData.needsInterface ? [0] : [],
            });
        }
        steps.push({
            action: 'generate_test',
            description: 'Generate comprehensive tests',
            input: {
                targetFile: planData.mainFile,
                testingApproach: planData.testingStrategy,
            },
            dependencies: [steps.length - 1],
        });
        if (memory.patterns.some((p) => p.type === 'optimization')) {
            steps.push({
                action: 'refactor_code',
                description: 'Apply optimization patterns',
                input: {
                    file: planData.mainFile,
                    improvements: ['performance', 'readability'],
                },
                dependencies: [1],
            });
        }
        return steps;
    }
    calculateConfidence(planData, memory) {
        let confidence = 0.5;
        const successfulSimilar = memory.similar.filter((t) => t.success).length;
        confidence += successfulSimilar * 0.1;
        confidence += Math.min(memory.patterns.length * 0.05, 0.2);
        confidence += Math.min(memory.codeSnippets.length * 0.05, 0.2);
        return Math.min(confidence, 0.95);
    }
    extractCode(response) {
        const codeMatch = response.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
        if (codeMatch) {
            return codeMatch[1].trim();
        }
        return response.trim();
    }
    analyzeImprovements(original, refactored) {
        const improvements = [];
        if (refactored.length < original.length * 0.9) {
            improvements.push('Reduced code size');
        }
        if (refactored.includes('try') && !original.includes('try')) {
            improvements.push('Added error handling');
        }
        if (refactored.split('\n').length < original.split('\n').length * 0.8) {
            improvements.push('Improved code density');
        }
        if (refactored.includes('const') > original.includes('const')) {
            improvements.push('Improved immutability');
        }
        return improvements.length > 0
            ? improvements
            : ['General code quality improvements'];
    }
    async storeSuccessfulPatterns(plan, result, context) {
        if (!this.memoryService || !result.success)
            return;
        const patterns = this.extractPatternsFromCode(result.output.files);
        for (const pattern of patterns) {
            await this.memoryService.longTerm.storePattern({
                id: `pattern-${Date.now()}-${Math.random()}`,
                type: 'code_generation',
                pattern: pattern.template,
                description: pattern.description,
                examples: [pattern.example],
                successRate: 100,
                usageCount: 1,
                createdAt: new Date(),
                lastUsed: new Date(),
            });
        }
    }
    extractPatternsFromCode(files) {
        const patterns = [];
        for (const file of files) {
            if (file.content.includes('class') &&
                file.content.includes('implements')) {
                patterns.push({
                    template: 'class ${ClassName} implements ${Interface}',
                    description: 'Class implementing interface pattern',
                    example: file.content.substring(0, 200),
                });
            }
            if (file.content.includes('async') && file.content.includes('try')) {
                patterns.push({
                    template: 'async method with error handling',
                    description: 'Async/await with try-catch pattern',
                    example: file.content.match(/async[\s\S]{0,200}catch/)?.[0] || '',
                });
            }
        }
        return patterns;
    }
    async getRelevantMemory(task, context) {
        if (!this.memoryService) {
            return { similar: [], episodes: [], patterns: [], codeSnippets: [] };
        }
        try {
            const memory = await this.memoryService.recallSimilarTasks(task, 5);
            const codeSnippets = await this.memoryService.longTerm.searchCodeSnippets(task.description);
            return {
                ...memory,
                codeSnippets,
            };
        }
        catch (error) {
            this.logger.warn('Failed to retrieve memory', error);
            return { similar: [], episodes: [], patterns: [], codeSnippets: [] };
        }
    }
    parseLLMResponse(response) {
        try {
            return JSON.parse(response);
        }
        catch {
            return {
                needsInterface: response.includes('interface'),
                needsImplementation: response.includes('implementation') || response.includes('class'),
                interface: { name: 'Generated', requirements: 'Based on task' },
                implementation: { name: 'Generated', description: 'Based on task' },
                mainFile: 'generated.ts',
                testingStrategy: 'comprehensive',
                estimatedTokens: 2000,
            };
        }
    }
};
exports.CodeAgent = CodeAgent;
exports.CodeAgent = CodeAgent = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LLMService, memory_service_1.MemoryService])
], CodeAgent);
//# sourceMappingURL=code.agent.js.map