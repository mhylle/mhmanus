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
export declare class TestGeneratorService {
    private readonly llmService;
    private readonly memoryService;
    private readonly templateService;
    private readonly logger;
    private testPatterns;
    constructor(llmService: LLMService, memoryService: MemoryService, templateService: TemplateService);
    private initializeTestPatterns;
    generateTests(request: TestGenerationRequest): Promise<GeneratedTest>;
    private analyzeCode;
    private basicCodeAnalysis;
    private getHistoricalTestPatterns;
    private createTestPlan;
    private selectApplicablePatterns;
    private parseTestPlan;
    private generateTestSuite;
    private generateTestsDirectly;
    private generateTestCases;
    private getEdgeCaseValue;
    private generateImports;
    private extractDependencies;
    private estimateCoverage;
    private identifyTestTypes;
    private extractTestCode;
    private storeTestGeneration;
    analyzeTestQuality(testCode: string): Promise<{
        quality: 'low' | 'medium' | 'high';
        issues: string[];
        suggestions: string[];
        score: number;
    }>;
}
