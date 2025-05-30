import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from '../base/base.agent';
import { LLMService } from '../../llm/llm.service';
import { MemoryService } from '../../memory/memory.service';
import {
  AgentCapability,
  AgentContext,
  AgentPlan,
  AgentStep,
  Decision,
  ExecutionResult,
  AgentMetadata,
  AgentType,
  Plan,
  AgentResult,
} from '../interfaces/agent.interface';
import { Task } from '../../tasks/entities/task.entity';

@Injectable()
export class CodeAgent extends BaseAgent {
  id = 'code-001';
  name = 'Code Agent';
  description = 'Autonomous code generation with memory integration';
  capabilities = [
    AgentCapability.CODE_GENERATION,
    AgentCapability.TESTING,
    AgentCapability.PATTERN_LEARNING,
  ];

  metadata: AgentMetadata = {
    id: 'code-001',
    name: 'Code Agent',
    type: AgentType.CODE,
    model: 'ollama',
    description: 'Autonomous code generation with memory integration',
    capabilities: ['code_generation', 'testing', 'pattern_learning'],
    maxConcurrentTasks: 3,
  };

  constructor(llmService: LLMService, memoryService: MemoryService) {
    super(llmService, memoryService);
  }

  protected async onInitialize(): Promise<void> {
    // Initialize any code-specific resources
    this.logger.log('Code Agent initialized');
  }

  async canHandle(task: Task): Promise<boolean> {
    // Check if this is a code generation task
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

  protected async createPlan(task: Task, context: AgentContext): Promise<Plan> {
    // Convert AgentPlan to Plan
    const agentPlan = await this.generateAgentPlan(task, context);
    return {
      steps: agentPlan.steps.map((step, index) => ({
        id: `step-${index}`,
        description: step.description,
        agentType: AgentType.CODE,
        dependencies: step.dependencies.map((d) => `step-${d}`),
        expectedOutput: step.action,
        tools: ['llm', 'memory'],
      })),
      estimatedDuration: agentPlan.estimatedTokens * 10, // rough estimate
      requiredAgents: [AgentType.CODE],
      confidence: agentPlan.confidence,
    };
  }

  protected async executePlan(
    plan: Plan,
    context: AgentContext,
  ): Promise<AgentResult> {
    // Convert Plan to AgentPlan for execution
    const agentPlan: AgentPlan = {
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

  async generateAgentPlan(
    task: Task,
    context: AgentContext,
  ): Promise<AgentPlan> {
    this.logger.log(`Code Agent planning for task: ${task.title}`);

    // Retrieve memory context
    const memory = await this.getRelevantMemory(task, context);

    // Build enhanced prompt with memory
    const prompt = this.buildCodePlanningPrompt(task, memory);

    // Generate plan using LLM
    const response = await this.llmService.generateCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a code generation agent that creates high-quality code based on past patterns.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const planData = this.parseLLMResponse(response.content);

    const plan: AgentPlan = {
      agentId: this.id,
      taskId: task.id,
      steps: this.generateCodeSteps(planData, memory),
      estimatedTokens: planData.estimatedTokens || 2000,
      confidence: this.calculateConfidence(planData, memory),
    };

    // Store planning decision
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

  async executeAgentPlan(
    plan: AgentPlan,
    context: AgentContext,
  ): Promise<ExecutionResult> {
    this.logger.log(`Code Agent executing plan for task ${plan.taskId}`);
    const startTime = Date.now();

    context.trace.steps = [];
    const generatedCode: Map<string, string> = new Map();
    const tests: Map<string, string> = new Map();
    let totalTokens = 0;

    try {
      for (const step of plan.steps) {
        const stepResult = await this.executeCodeStep(
          step,
          context,
          generatedCode,
          tests,
        );

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

      const result: ExecutionResult = {
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

      // Store successful patterns
      await this.storeSuccessfulPatterns(plan, result, context);

      return result;
    } catch (error) {
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

  private async executeCodeStep(
    step: AgentStep,
    context: AgentContext,
    generatedCode: Map<string, string>,
    tests: Map<string, string>,
  ): Promise<{
    success: boolean;
    output: any;
    duration: number;
    tokensUsed: number;
  }> {
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

  private async generateInterface(
    step: AgentStep,
    context: AgentContext,
    generatedCode: Map<string, string>,
  ): Promise<any> {
    const startTime = Date.now();

    // Get similar interfaces from memory
    const similarInterfaces = await this.memoryService?.semantic.searchSimilar(
      `interface ${step.input.name}`,
      5,
    );

    const prompt = `Generate a TypeScript interface for ${step.input.name}.
Requirements: ${step.input.requirements}

${
  similarInterfaces && similarInterfaces.length > 0
    ? `
Similar interfaces from past projects:
${similarInterfaces.map((s) => s.content).join('\n\n')}
`
    : ''
}

Follow TypeScript best practices and include proper documentation.`;

    const response = await this.llmService.generateCompletion({
      messages: [
        { role: 'system', content: 'You are an expert TypeScript developer.' },
        { role: 'user', content: prompt },
      ],
    });

    const code = this.extractCode(response.content);
    const filePath =
      step.input.path || `src/interfaces/${step.input.name}.interface.ts`;

    generatedCode.set(filePath, code);

    // Store in semantic memory
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

  private async generateImplementation(
    step: AgentStep,
    context: AgentContext,
    generatedCode: Map<string, string>,
  ): Promise<any> {
    const startTime = Date.now();

    // Get relevant code patterns
    const patterns =
      await this.memoryService?.longTerm.getPatterns('code_generation');
    const similarCode = await this.memoryService?.longTerm.searchCodeSnippets(
      step.input.description,
    );

    const prompt = `Generate TypeScript implementation for: ${step.input.description}

${
  step.input.interface
    ? `Interface to implement:
${step.input.interface}`
    : ''
}

${
  patterns && patterns.length > 0
    ? `
Apply these successful patterns:
${patterns.map((p) => `- ${p.description}: ${p.pattern}`).join('\n')}
`
    : ''
}

${
  similarCode && similarCode.length > 0
    ? `
Reference implementations:
${similarCode.map((s) => s.code).join('\n\n---\n\n')}
`
    : ''
}

Requirements:
- Follow TypeScript best practices
- Include error handling
- Add appropriate logging
- Make the code testable`;

    const response = await this.llmService.generateCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert TypeScript developer focused on clean, maintainable code.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const code = this.extractCode(response.content);
    const filePath =
      step.input.path || `src/services/${step.input.name}.service.ts`;

    generatedCode.set(filePath, code);

    // Store code snippet
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

  private async generateTest(
    step: AgentStep,
    context: AgentContext,
    tests: Map<string, string>,
    generatedCode: Map<string, string>,
  ): Promise<any> {
    const startTime = Date.now();

    const codeToTest =
      generatedCode.get(step.input.targetFile) || step.input.code;

    // Get test patterns from successful tests
    const testPatterns =
      await this.memoryService?.longTerm.getPatterns('testing');

    const prompt = `Generate comprehensive tests for the following code:

${codeToTest}

${
  testPatterns && testPatterns.length > 0
    ? `
Apply these successful test patterns:
${testPatterns.map((p) => `- ${p.description}`).join('\n')}
`
    : ''
}

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
    const testPath =
      step.input.path || step.input.targetFile.replace('.ts', '.spec.ts');

    tests.set(testPath, testCode);

    return {
      success: true,
      output: { testPath, testCount: (testCode.match(/it\(/g) || []).length },
      duration: Date.now() - startTime,
      tokensUsed: response.usage?.totalTokens || 800,
    };
  }

  private async refactorCode(
    step: AgentStep,
    context: AgentContext,
    generatedCode: Map<string, string>,
  ): Promise<any> {
    const startTime = Date.now();

    const currentCode = generatedCode.get(step.input.file) || step.input.code;

    // Get optimization patterns
    const optimizations =
      await this.memoryService?.longTerm.getPatterns('optimization');

    const prompt = `Refactor the following code for better quality:

${currentCode}

Focus on:
${
  step.input.improvements?.join('\n') ||
  `
- Readability
- Performance
- Maintainability
- Error handling
- Code reuse`
}

${
  optimizations && optimizations.length > 0
    ? `
Apply these optimization patterns:
${optimizations.map((p) => p.description).join('\n')}
`
    : ''
}`;

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

  private async applyLearnedPattern(
    step: AgentStep,
    context: AgentContext,
    generatedCode: Map<string, string>,
  ): Promise<any> {
    const startTime = Date.now();

    const pattern = await this.memoryService?.longTerm.getPatterns(
      step.input.patternType,
    );
    if (!pattern || pattern.length === 0) {
      return {
        success: false,
        output: `No patterns found for type: ${step.input.patternType}`,
        duration: Date.now() - startTime,
        tokensUsed: 0,
      };
    }

    // Apply the most successful pattern
    const bestPattern = pattern.reduce((best, current) =>
      current.successRate > best.successRate ? current : best,
    );

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
          content:
            'Apply the given pattern precisely while adapting to the specific requirements.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const code = this.extractCode(response.content);
    const filePath = step.input.path || `src/generated/${step.input.name}.ts`;

    generatedCode.set(filePath, code);

    // Update pattern usage
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

  private buildCodePlanningPrompt(task: Task, memory: any): string {
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

  private generateCodeSteps(planData: any, memory: any): AgentStep[] {
    const steps: AgentStep[] = [];

    // Analyze task to determine what needs to be generated
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

    // Always generate tests
    steps.push({
      action: 'generate_test',
      description: 'Generate comprehensive tests',
      input: {
        targetFile: planData.mainFile,
        testingApproach: planData.testingStrategy,
      },
      dependencies: [steps.length - 1],
    });

    // Add refactoring step if quality improvements needed
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

  private calculateConfidence(planData: any, memory: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on similar successful tasks
    const successfulSimilar = memory.similar.filter((t) => t.success).length;
    confidence += successfulSimilar * 0.1;

    // Increase confidence based on available patterns
    confidence += Math.min(memory.patterns.length * 0.05, 0.2);

    // Increase confidence based on code snippets
    confidence += Math.min(memory.codeSnippets.length * 0.05, 0.2);

    return Math.min(confidence, 0.95);
  }

  private extractCode(response: string): string {
    // Extract code from markdown code blocks
    const codeMatch = response.match(
      /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/,
    );
    if (codeMatch) {
      return codeMatch[1].trim();
    }

    // If no code block, assume entire response is code
    return response.trim();
  }

  private analyzeImprovements(original: string, refactored: string): string[] {
    const improvements: string[] = [];

    // Simple analysis - in production, use proper AST analysis
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

  private async storeSuccessfulPatterns(
    plan: AgentPlan,
    result: ExecutionResult,
    context: AgentContext,
  ): Promise<void> {
    if (!this.memoryService || !result.success) return;

    // Extract patterns from successful execution
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

  private extractPatternsFromCode(files: any[]): any[] {
    const patterns: any[] = [];

    for (const file of files) {
      // Simple pattern extraction - in production, use proper AST analysis
      if (
        file.content.includes('class') &&
        file.content.includes('implements')
      ) {
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

  private async getRelevantMemory(
    task: Task,
    context: AgentContext,
  ): Promise<any> {
    if (!this.memoryService) {
      return { similar: [], episodes: [], patterns: [], codeSnippets: [] };
    }

    try {
      const memory = await this.memoryService.recallSimilarTasks(task, 5);
      const codeSnippets = await this.memoryService.longTerm.searchCodeSnippets(
        task.description,
      );

      return {
        ...memory,
        codeSnippets,
      };
    } catch (error) {
      this.logger.warn('Failed to retrieve memory', error);
      return { similar: [], episodes: [], patterns: [], codeSnippets: [] };
    }
  }

  private parseLLMResponse(response: string): any {
    try {
      // Try to parse as JSON first
      return JSON.parse(response);
    } catch {
      // Fallback to simple parsing
      return {
        needsInterface: response.includes('interface'),
        needsImplementation:
          response.includes('implementation') || response.includes('class'),
        interface: { name: 'Generated', requirements: 'Based on task' },
        implementation: { name: 'Generated', description: 'Based on task' },
        mainFile: 'generated.ts',
        testingStrategy: 'comprehensive',
        estimatedTokens: 2000,
      };
    }
  }
}
