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
var TestGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../../llm/llm.service");
const memory_service_1 = require("../../memory/memory.service");
const template_service_1 = require("../templates/template.service");
let TestGeneratorService = TestGeneratorService_1 = class TestGeneratorService {
    llmService;
    memoryService;
    templateService;
    logger = new common_1.Logger(TestGeneratorService_1.name);
    testPatterns = new Map();
    constructor(llmService, memoryService, templateService) {
        this.llmService = llmService;
        this.memoryService = memoryService;
        this.templateService = templateService;
        this.initializeTestPatterns();
    }
    initializeTestPatterns() {
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
    async generateTests(request) {
        this.logger.log(`Generating tests for ${request.filePath}`);
        const codeAnalysis = await this.analyzeCode(request.code);
        const historicalTests = await this.getHistoricalTestPatterns(codeAnalysis);
        const testPlan = await this.createTestPlan(codeAnalysis, historicalTests, request);
        const generatedTests = await this.generateTestSuite(testPlan, request);
        await this.storeTestGeneration(generatedTests, request);
        return generatedTests;
    }
    async analyzeCode(code) {
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
                    content: 'You are a test analysis expert. Analyze code and identify comprehensive test requirements.',
                },
                { role: 'user', content: prompt },
            ],
        });
        try {
            return JSON.parse(response.content);
        }
        catch {
            return this.basicCodeAnalysis(code);
        }
    }
    basicCodeAnalysis(code) {
        const analysis = {
            functions: [],
            classes: [],
            async: code.includes('async') || code.includes('Promise'),
            dependencies: [],
            complexity: 'medium',
        };
        const functionMatches = code.matchAll(/(?:async\s+)?function\s+(\w+)|(?:async\s+)?(\w+)\s*\(/g);
        for (const match of functionMatches) {
            analysis.functions.push(match[1] || match[2]);
        }
        const classMatches = code.matchAll(/class\s+(\w+)/g);
        for (const match of classMatches) {
            analysis.classes.push(match[1]);
        }
        const importMatches = code.matchAll(/import\s+.*from\s+['"](.+)['"]/g);
        for (const match of importMatches) {
            if (!match[1].startsWith('.')) {
                analysis.dependencies.push(match[1]);
            }
        }
        return analysis;
    }
    async getHistoricalTestPatterns(codeAnalysis) {
        const patterns = [];
        const similarCode = await this.memoryService.semantic.searchSimilar(`test ${codeAnalysis.functions.join(' ')} ${codeAnalysis.classes.join(' ')}`, 5);
        const testPatterns = await this.memoryService.longTerm.getPatterns('testing');
        const testSnippets = await this.memoryService.longTerm.searchCodeSnippets('test');
        return {
            similarTests: similarCode.filter((s) => s.metadata.tags?.includes('test')),
            patterns: testPatterns,
            snippets: testSnippets,
        };
    }
    async createTestPlan(codeAnalysis, historicalTests, request) {
        const applicablePatterns = this.selectApplicablePatterns(codeAnalysis);
        const prompt = `Create a comprehensive test plan for the following code analysis:

Code Analysis:
${JSON.stringify(codeAnalysis, null, 2)}

Available Test Patterns:
${applicablePatterns.map((p) => `- ${p.name}: ${p.description}`).join('\n')}

${historicalTests.patterns.length > 0
            ? `
Historical Successful Patterns:
${historicalTests.patterns.map((p) => `- ${p.description} (${p.successRate}% success)`).join('\n')}
`
            : ''}

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
                    content: 'You are a test planning expert. Create comprehensive test plans.',
                },
                { role: 'user', content: prompt },
            ],
        });
        return this.parseTestPlan(response.content);
    }
    selectApplicablePatterns(codeAnalysis) {
        const patterns = [];
        if (codeAnalysis.async) {
            patterns.push(this.testPatterns.get('async-test'));
        }
        if (codeAnalysis.functions.length > 0 || codeAnalysis.classes.length > 0) {
            patterns.push(this.testPatterns.get('unit-test'));
        }
        patterns.push(this.testPatterns.get('edge-case'));
        patterns.push(this.testPatterns.get('error-handling'));
        return patterns;
    }
    parseTestPlan(response) {
        const plan = {
            suites: [],
            totalTests: 0,
            mockSetup: [],
            edgeCases: [],
        };
        const suiteMatches = response.matchAll(/describe\(['"](.+?)['"]/g);
        for (const match of suiteMatches) {
            plan.suites.push(match[1]);
        }
        const testMatches = response.matchAll(/it\(['"](.+?)['"]/g);
        plan.totalTests = Array.from(testMatches).length;
        return plan;
    }
    async generateTestSuite(testPlan, request) {
        const testTemplate = await this.templateService.getTemplate('jest-test');
        if (!testTemplate) {
            return this.generateTestsDirectly(testPlan, request);
        }
        const className = request.filePath
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
        const testCode = await this.templateService.renderTemplate('jest-test', variables);
        return {
            testCode,
            testPath: request.filePath.replace(/\.[^.]+$/, '.spec.ts'),
            framework: request.framework || 'jest',
            coverageEstimate: this.estimateCoverage(testPlan),
            testCount: testPlan.totalTests,
            testTypes: this.identifyTestTypes(testPlan),
        };
    }
    async generateTestsDirectly(testPlan, request) {
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
                    content: 'You are an expert test developer. Generate high-quality, comprehensive tests.',
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
    generateTestCases(testPlan) {
        const testCases = [];
        testCases.push({
            description: 'should create an instance',
            arrange: 'const instance = new TestClass();',
            act: 'const result = instance.method();',
            assert: 'expect(result).toBeDefined();',
        });
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
    getEdgeCaseValue(edgeCase) {
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
    generateImports(code) {
        const imports = [];
        const importMatches = code.matchAll(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g);
        for (const match of importMatches) {
            imports.push({
                name: match[1].trim(),
                path: match[2],
            });
        }
        return imports;
    }
    extractDependencies(code) {
        const deps = [];
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
    estimateCoverage(testPlan) {
        const baseCount = testPlan.totalTests || 0;
        const hasEdgeCases = testPlan.edgeCases?.length > 0;
        const hasMocks = testPlan.mockSetup?.length > 0;
        let coverage = Math.min(baseCount * 10, 70);
        if (hasEdgeCases)
            coverage += 15;
        if (hasMocks)
            coverage += 10;
        return Math.min(coverage, 95);
    }
    identifyTestTypes(testPlan) {
        const types = ['unit'];
        if (testPlan.edgeCases?.length > 0)
            types.push('edge-cases');
        if (testPlan.mockSetup?.length > 0)
            types.push('mocked');
        if (testPlan.suites?.some((s) => s.includes('integration')))
            types.push('integration');
        if (testPlan.suites?.some((s) => s.includes('performance')))
            types.push('performance');
        return types;
    }
    extractTestCode(response) {
        const codeMatch = response.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
        if (codeMatch) {
            return codeMatch[1].trim();
        }
        return response.trim();
    }
    async storeTestGeneration(generatedTest, request) {
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
        await this.memoryService.semantic.storeEmbedding(generatedTest.testCode, {
            type: 'code',
            source: 'test_generator',
            tags: ['test', ...generatedTest.testTypes],
            timestamp: new Date(),
        });
        if (generatedTest.coverageEstimate > 80) {
            await this.templateService.learnFromCode(generatedTest.testCode, {
                language: request.language,
                category: 'test',
                description: `High coverage test suite (${generatedTest.coverageEstimate}%)`,
                success: true,
            });
        }
    }
    async analyzeTestQuality(testCode) {
        const issues = [];
        const suggestions = [];
        let score = 100;
        if (!testCode.includes('describe(')) {
            issues.push('Missing test suite structure');
            score -= 20;
        }
        const assertionCount = (testCode.match(/expect\(/g) || []).length;
        const testCount = (testCode.match(/it\(/g) || []).length;
        if (testCount > 0 && assertionCount / testCount < 1) {
            issues.push('Some tests lack assertions');
            suggestions.push('Add at least one assertion per test');
            score -= 15;
        }
        if (testCode.includes('async') && !testCode.includes('await')) {
            issues.push('Async functions without await');
            suggestions.push('Ensure all async operations are properly awaited');
            score -= 10;
        }
        if (testCode.includes('mock') && !testCode.includes('clearAllMocks')) {
            suggestions.push('Consider clearing mocks between tests');
            score -= 5;
        }
        const hasEdgeCases = testCode.includes('null') ||
            testCode.includes('undefined') ||
            testCode.includes('empty');
        if (!hasEdgeCases) {
            suggestions.push('Add tests for edge cases (null, undefined, empty values)');
            score -= 10;
        }
        const quality = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';
        return { quality, issues, suggestions, score };
    }
};
exports.TestGeneratorService = TestGeneratorService;
exports.TestGeneratorService = TestGeneratorService = TestGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LLMService,
        memory_service_1.MemoryService,
        template_service_1.TemplateService])
], TestGeneratorService);
//# sourceMappingURL=test-generator.service.js.map