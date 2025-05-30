import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../../llm/llm.service';
import { MemoryService } from '../../memory/memory.service';
import { TemplateService } from '../templates/template.service';

export interface TestGenerationRequest {
  code: string;
  filePath: string;
  language: string;
  framework?: 'jest' | 'jasmine' | 'mocha' | 'vitest';
  coverage?: 'basic' | 'comprehensive' | 'edge-cases';
  includeIntegration?: boolean;
}

export interface GeneratedTest {
  testCode: string;
  testPath: string;
  framework: string;
  coverageEstimate: number;
  testCount: number;
  testTypes: string[];
}

export interface TestPattern {
  name: string;
  description: string;
  applicableFor: string[];
  template: string;
  examples: string[];
  successRate: number;
}

@Injectable()
export class TestGeneratorService {
  private readonly logger = new Logger(TestGeneratorService.name);
  private testPatterns: Map<string, TestPattern> = new Map();

  constructor(
    private readonly llmService: LLMService,
    private readonly memoryService: MemoryService,
    private readonly templateService: TemplateService,
  ) {
    this.initializeTestPatterns();
  }

  private initializeTestPatterns(): void {
    // Unit Test Pattern
    this.testPatterns.set('unit-test', {
      name: 'Unit Test Pattern',
      description: 'Standard unit test with mocks and assertions',
      applicableFor: ['function', 'method', 'class'],
      template: `
it('should {{action}} when {{condition}}', () => {
  // Arrange
  const {{input}} = {{inputValue}};
  {{#mocks}}
  {{mockName}}.{{mockMethod}}.mockReturnValue({{mockReturn}});
  {{/mocks}}
  
  // Act
  const result = {{methodCall}};
  
  // Assert
  expect(result).{{assertion}};
  {{#mockAssertions}}
  expect({{mockName}}.{{mockMethod}}).toHaveBeenCalledWith({{expectedArgs}});
  {{/mockAssertions}}
});`,
      examples: [],
      successRate: 95,
    });

    // Edge Case Pattern
    this.testPatterns.set('edge-case', {
      name: 'Edge Case Test Pattern',
      description: 'Tests for boundary conditions and edge cases',
      applicableFor: ['validation', 'calculation', 'parsing'],
      template: `
describe('edge cases', () => {
  {{#cases}}
  it('should handle {{caseName}}', () => {
    const input = {{edgeValue}};
    {{#shouldThrow}}
    expect(() => {{methodCall}}).toThrow({{errorType}});
    {{/shouldThrow}}
    {{^shouldThrow}}
    const result = {{methodCall}};
    expect(result).{{assertion}};
    {{/shouldThrow}}
  });
  {{/cases}}
});`,
      examples: [],
      successRate: 90,
    });

    // Async Test Pattern
    this.testPatterns.set('async-test', {
      name: 'Async Test Pattern',
      description: 'Tests for async functions and promises',
      applicableFor: ['async', 'promise', 'api'],
      template: `
it('should {{action}} asynchronously', async () => {
  // Arrange
  const {{input}} = {{inputValue}};
  {{#mocks}}
  {{mockName}}.{{mockMethod}}.mockResolvedValue({{mockReturn}});
  {{/mocks}}
  
  // Act
  const result = await {{methodCall}};
  
  // Assert
  expect(result).{{assertion}};
  {{#timing}}
  expect(performance.now() - startTime).toBeLessThan({{maxTime}});
  {{/timing}}
});`,
      examples: [],
      successRate: 92,
    });

    // Error Handling Pattern
    this.testPatterns.set('error-handling', {
      name: 'Error Handling Test Pattern',
      description: 'Tests for error scenarios and exception handling',
      applicableFor: ['error', 'exception', 'validation'],
      template: `
describe('error handling', () => {
  {{#errors}}
  it('should throw {{errorType}} when {{condition}}', async () => {
    // Arrange
    const {{input}} = {{invalidValue}};
    {{#setupMocks}}
    {{mockName}}.{{mockMethod}}.mockRejectedValue(new {{errorType}}('{{errorMessage}}'));
    {{/setupMocks}}
    
    // Act & Assert
    await expect({{methodCall}}).rejects.toThrow({{errorType}});
    {{#errorValidation}}
    await expect({{methodCall}}).rejects.toMatchObject({
      message: {{expectedMessage}},
      {{#additionalProps}}
      {{propName}}: {{propValue}},
      {{/additionalProps}}
    });
    {{/errorValidation}}
  });
  {{/errors}}
});`,
      examples: [],
      successRate: 88,
    });
  }

  async generateTests(request: TestGenerationRequest): Promise<GeneratedTest> {
    this.logger.log(`Generating tests for ${request.filePath}`);

    // Analyze code to understand what needs testing
    const codeAnalysis = await this.analyzeCode(request.code);

    // Get relevant test patterns from memory
    const historicalTests = await this.getHistoricalTestPatterns(codeAnalysis);

    // Generate test plan
    const testPlan = await this.createTestPlan(
      codeAnalysis,
      historicalTests,
      request,
    );

    // Generate actual tests
    const generatedTests = await this.generateTestSuite(testPlan, request);

    // Store successful test generation
    await this.storeTestGeneration(generatedTests, request);

    return generatedTests;
  }

  private async analyzeCode(code: string): Promise<any> {
    const prompt = `Analyze this code and identify what needs to be tested:

${code}

Provide:
1. List of functions/methods to test
2. Input/output types
3. Dependencies that need mocking
4. Potential edge cases
5. Error conditions to test

Format as JSON.`;

    const response = await this.llmService.generateCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a test analysis expert. Analyze code and identify comprehensive test requirements.',
        },
        { role: 'user', content: prompt },
      ],
    });

    try {
      return JSON.parse(response.content);
    } catch {
      // Fallback to basic analysis
      return this.basicCodeAnalysis(code);
    }
  }

  private basicCodeAnalysis(code: string): any {
    const analysis = {
      functions: [] as string[],
      classes: [] as string[],
      async: code.includes('async') || code.includes('Promise'),
      dependencies: [] as string[],
      complexity: 'medium',
    };

    // Extract function names
    const functionMatches = code.matchAll(
      /(?:async\s+)?function\s+(\w+)|(?:async\s+)?(\w+)\s*\(/g,
    );
    for (const match of functionMatches) {
      analysis.functions.push(match[1] || match[2]);
    }

    // Extract class names
    const classMatches = code.matchAll(/class\s+(\w+)/g);
    for (const match of classMatches) {
      analysis.classes.push(match[1]);
    }

    // Detect dependencies (simple import analysis)
    const importMatches = code.matchAll(/import\s+.*from\s+['"](.+)['"]/g);
    for (const match of importMatches) {
      if (!match[1].startsWith('.')) {
        analysis.dependencies.push(match[1]);
      }
    }

    return analysis;
  }

  private async getHistoricalTestPatterns(codeAnalysis: any): Promise<any> {
    const patterns = [];

    // Search for similar code that was tested
    const similarCode = await this.memoryService.semantic.searchSimilar(
      `test ${codeAnalysis.functions.join(' ')} ${codeAnalysis.classes.join(' ')}`,
      5,
    );

    // Get successful test patterns
    const testPatterns =
      await this.memoryService.longTerm.getPatterns('testing');

    // Get test snippets
    const testSnippets =
      await this.memoryService.longTerm.searchCodeSnippets('test');

    return {
      similarTests: similarCode.filter((s) =>
        s.metadata.tags?.includes('test'),
      ),
      patterns: testPatterns,
      snippets: testSnippets,
    };
  }

  private async createTestPlan(
    codeAnalysis: any,
    historicalTests: any,
    request: TestGenerationRequest,
  ): Promise<any> {
    const applicablePatterns = this.selectApplicablePatterns(codeAnalysis);

    const prompt = `Create a comprehensive test plan for the following code analysis:

Code Analysis:
${JSON.stringify(codeAnalysis, null, 2)}

Available Test Patterns:
${applicablePatterns.map((p) => `- ${p.name}: ${p.description}`).join('\n')}

${
  historicalTests.patterns.length > 0
    ? `
Historical Successful Patterns:
${historicalTests.patterns.map((p) => `- ${p.description} (${p.successRate}% success)`).join('\n')}
`
    : ''
}

Requirements:
- Framework: ${request.framework || 'jest'}
- Coverage: ${request.coverage || 'comprehensive'}
- Include integration tests: ${request.includeIntegration || false}

Generate a detailed test plan with:
1. Test suites to create
2. Specific test cases for each function/method
3. Mock setup requirements
4. Edge cases to cover
5. Performance tests if applicable`;

    const response = await this.llmService.generateCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a test planning expert. Create comprehensive test plans.',
        },
        { role: 'user', content: prompt },
      ],
    });

    return this.parseTestPlan(response.content);
  }

  private selectApplicablePatterns(codeAnalysis: any): TestPattern[] {
    const patterns: TestPattern[] = [];

    // Select patterns based on code characteristics
    if (codeAnalysis.async) {
      patterns.push(this.testPatterns.get('async-test')!);
    }

    if (codeAnalysis.functions.length > 0 || codeAnalysis.classes.length > 0) {
      patterns.push(this.testPatterns.get('unit-test')!);
    }

    // Always include edge cases and error handling
    patterns.push(this.testPatterns.get('edge-case')!);
    patterns.push(this.testPatterns.get('error-handling')!);

    return patterns;
  }

  private parseTestPlan(response: string): any {
    // Simple parsing - in production, use structured output
    const plan = {
      suites: [] as string[],
      totalTests: 0,
      mockSetup: [] as string[],
      edgeCases: [] as string[],
    };

    // Extract test suites
    const suiteMatches = response.matchAll(/describe\(['"](.+?)['"]/g);
    for (const match of suiteMatches) {
      plan.suites.push(match[1]);
    }

    // Count test cases
    const testMatches = response.matchAll(/it\(['"](.+?)['"]/g);
    plan.totalTests = Array.from(testMatches).length;

    return plan;
  }

  private async generateTestSuite(
    testPlan: any,
    request: TestGenerationRequest,
  ): Promise<GeneratedTest> {
    // Use template service for consistent test structure
    const testTemplate = await this.templateService.getTemplate('jest-test');

    if (!testTemplate) {
      // Fallback to direct generation
      return this.generateTestsDirectly(testPlan, request);
    }

    // Prepare template variables
    const className =
      request.filePath
        .split('/')
        .pop()
        ?.replace(/\.[^.]+$/, '') || 'Component';
    const variables = {
      className: className.charAt(0).toUpperCase() + className.slice(1),
      fileName: className,
      instanceName: className.charAt(0).toLowerCase() + className.slice(1),
      tests: this.generateTestCases(testPlan),
      imports: this.generateImports(request.code),
      dependencies: this.extractDependencies(request.code),
    };

    const testCode = await this.templateService.renderTemplate(
      'jest-test',
      variables,
    );

    return {
      testCode,
      testPath: request.filePath.replace(/\.[^.]+$/, '.spec.ts'),
      framework: request.framework || 'jest',
      coverageEstimate: this.estimateCoverage(testPlan),
      testCount: testPlan.totalTests,
      testTypes: this.identifyTestTypes(testPlan),
    };
  }

  private async generateTestsDirectly(
    testPlan: any,
    request: TestGenerationRequest,
  ): Promise<GeneratedTest> {
    const prompt = `Generate comprehensive ${request.framework || 'jest'} tests for:

${request.code}

Test Plan:
${JSON.stringify(testPlan, null, 2)}

Requirements:
- Use ${request.framework || 'jest'} framework
- Include all necessary imports and mocks
- Cover ${request.coverage || 'comprehensive'} test cases
- Follow testing best practices
- Include clear test descriptions`;

    const response = await this.llmService.generateCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert test developer. Generate high-quality, comprehensive tests.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const testCode = this.extractTestCode(response.content);

    return {
      testCode,
      testPath: request.filePath.replace(/\.[^.]+$/, '.spec.ts'),
      framework: request.framework || 'jest',
      coverageEstimate: 85,
      testCount: (testCode.match(/it\(/g) || []).length,
      testTypes: ['unit', 'edge-cases'],
    };
  }

  private generateTestCases(testPlan: any): any[] {
    // Transform test plan into template-compatible format
    const testCases: any[] = [];

    // Add basic functionality tests
    testCases.push({
      description: 'should create an instance',
      arrange: 'const instance = new TestClass();',
      act: 'const result = instance.method();',
      assert: 'expect(result).toBeDefined();',
    });

    // Add edge case tests
    for (const edgeCase of testPlan.edgeCases || []) {
      testCases.push({
        description: `should handle ${edgeCase}`,
        arrange: `const input = ${this.getEdgeCaseValue(edgeCase)};`,
        act: 'const result = instance.method(input);',
        assert: 'expect(result).toBeNull();',
      });
    }

    return testCases;
  }

  private getEdgeCaseValue(edgeCase: string): string {
    const edgeValues = {
      null: 'null',
      undefined: 'undefined',
      empty: '""',
      zero: '0',
      negative: '-1',
      large: 'Number.MAX_SAFE_INTEGER',
    };

    return edgeValues[edgeCase] || 'null';
  }

  private generateImports(code: string): any[] {
    const imports: any[] = [];

    // Extract imports from original code
    const importMatches = code.matchAll(
      /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
    );
    for (const match of importMatches) {
      imports.push({
        name: match[1].trim(),
        path: match[2],
      });
    }

    return imports;
  }

  private extractDependencies(code: string): any[] {
    const deps: any[] = [];

    // Simple constructor parameter extraction
    const constructorMatch = code.match(/constructor\s*\(([^)]+)\)/);
    if (constructorMatch) {
      const params = constructorMatch[1].split(',');
      for (const param of params) {
        const match = param.match(/(\w+):\s*(\w+)/);
        if (match) {
          deps.push({
            name: match[1].trim(),
            type: match[2].trim(),
          });
        }
      }
    }

    return deps;
  }

  private estimateCoverage(testPlan: any): number {
    // Simple coverage estimation based on test count and types
    const baseCount = testPlan.totalTests || 0;
    const hasEdgeCases = testPlan.edgeCases?.length > 0;
    const hasMocks = testPlan.mockSetup?.length > 0;

    let coverage = Math.min(baseCount * 10, 70); // Base coverage
    if (hasEdgeCases) coverage += 15;
    if (hasMocks) coverage += 10;

    return Math.min(coverage, 95);
  }

  private identifyTestTypes(testPlan: any): string[] {
    const types = ['unit'];

    if (testPlan.edgeCases?.length > 0) types.push('edge-cases');
    if (testPlan.mockSetup?.length > 0) types.push('mocked');
    if (testPlan.suites?.some((s) => s.includes('integration')))
      types.push('integration');
    if (testPlan.suites?.some((s) => s.includes('performance')))
      types.push('performance');

    return types;
  }

  private extractTestCode(response: string): string {
    // Extract code from markdown blocks
    const codeMatch = response.match(
      /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/,
    );
    if (codeMatch) {
      return codeMatch[1].trim();
    }

    return response.trim();
  }

  private async storeTestGeneration(
    generatedTest: GeneratedTest,
    request: TestGenerationRequest,
  ): Promise<void> {
    // Store test code as snippet
    await this.memoryService.longTerm.storeCodeSnippet({
      id: `test-${Date.now()}`,
      language: request.language,
      purpose: `Tests for ${request.filePath}`,
      code: generatedTest.testCode,
      tags: ['test', generatedTest.framework, ...generatedTest.testTypes],
      usageCount: 1,
      successRate: 100,
      createdAt: new Date(),
      lastUsed: new Date(),
    });

    // Store in semantic memory for similarity search
    await this.memoryService.semantic.storeEmbedding(generatedTest.testCode, {
      type: 'code',
      source: 'test_generator',
      tags: ['test', ...generatedTest.testTypes],
      timestamp: new Date(),
    });

    // Learn from successful test generation
    if (generatedTest.coverageEstimate > 80) {
      await this.templateService.learnFromCode(generatedTest.testCode, {
        language: request.language,
        category: 'test',
        description: `High coverage test suite (${generatedTest.coverageEstimate}%)`,
        success: true,
      });
    }
  }

  async analyzeTestQuality(testCode: string): Promise<{
    quality: 'low' | 'medium' | 'high';
    issues: string[];
    suggestions: string[];
    score: number;
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for test structure
    if (!testCode.includes('describe(')) {
      issues.push('Missing test suite structure');
      score -= 20;
    }

    // Check for assertions
    const assertionCount = (testCode.match(/expect\(/g) || []).length;
    const testCount = (testCode.match(/it\(/g) || []).length;

    if (testCount > 0 && assertionCount / testCount < 1) {
      issues.push('Some tests lack assertions');
      suggestions.push('Add at least one assertion per test');
      score -= 15;
    }

    // Check for async handling
    if (testCode.includes('async') && !testCode.includes('await')) {
      issues.push('Async functions without await');
      suggestions.push('Ensure all async operations are properly awaited');
      score -= 10;
    }

    // Check for mocks
    if (testCode.includes('mock') && !testCode.includes('clearAllMocks')) {
      suggestions.push('Consider clearing mocks between tests');
      score -= 5;
    }

    // Check for edge cases
    const hasEdgeCases =
      testCode.includes('null') ||
      testCode.includes('undefined') ||
      testCode.includes('empty');
    if (!hasEdgeCases) {
      suggestions.push(
        'Add tests for edge cases (null, undefined, empty values)',
      );
      score -= 10;
    }

    const quality = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';

    return { quality, issues, suggestions, score };
  }
}
