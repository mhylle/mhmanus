import { TemplateService, CodeTemplate } from './templates/template.service';
import { TestGeneratorService, TestGenerationRequest, GeneratedTest } from './testing/test-generator.service';
import { ProjectGeneratorService, ProjectGenerationRequest, GeneratedProject } from './project/project-generator.service';
import { CodeQualityService, CodeQualityAnalysis } from './quality/code-quality.service';
export declare class GenerateCodeDto {
    description: string;
    language: string;
    framework?: string;
    type: 'function' | 'class' | 'interface' | 'service' | 'component';
    includeTests?: boolean;
}
export declare class GenerateTestsDto implements TestGenerationRequest {
    code: string;
    filePath: string;
    language: string;
    framework?: 'jest' | 'jasmine' | 'mocha' | 'vitest';
    coverage?: 'basic' | 'comprehensive' | 'edge-cases';
    includeIntegration?: boolean;
}
export declare class GenerateProjectDto implements ProjectGenerationRequest {
    name: string;
    description: string;
    type: 'api' | 'library' | 'microservice' | 'fullstack' | 'cli';
    framework?: string;
    features: string[];
    language: 'typescript' | 'javascript';
    includeTests?: boolean;
    includeDocker?: boolean;
    includeDocs?: boolean;
}
export declare class AnalyzeCodeDto {
    code: string;
    filePath: string;
    language?: string;
}
export declare class RenderTemplateDto {
    templateId: string;
    variables: Record<string, any>;
}
export declare class CodeGenerationController {
    private readonly templateService;
    private readonly testGenerator;
    private readonly projectGenerator;
    private readonly codeQuality;
    constructor(templateService: TemplateService, testGenerator: TestGeneratorService, projectGenerator: ProjectGeneratorService, codeQuality: CodeQualityService);
    generateCode(dto: GenerateCodeDto): Promise<{
        success: boolean;
        error: string;
        result?: undefined;
    } | {
        success: boolean;
        result: {
            code: string;
            language: string;
            type: "function" | "class" | "interface" | "service" | "component";
        };
        error?: undefined;
    }>;
    generateTests(dto: GenerateTestsDto): Promise<GeneratedTest>;
    generateProject(dto: GenerateProjectDto): Promise<{
        success: boolean;
        project?: GeneratedProject;
        error?: string;
    }>;
    analyzeCode(dto: AnalyzeCodeDto): Promise<CodeQualityAnalysis>;
    getTemplates(category?: string): Promise<CodeTemplate[]>;
    searchTemplates(query: string): Promise<CodeTemplate[]>;
    getTemplate(id: string): Promise<CodeTemplate | null>;
    renderTemplate(dto: RenderTemplateDto): Promise<{
        success: boolean;
        code?: string;
        error?: string;
    }>;
    compareQuality(dto: {
        code: string;
        language: string;
    }): Promise<{
        averageScore: number;
        betterThan: number;
        commonPatterns: string[];
        recommendations: string[];
    }>;
    learnFromCode(dto: {
        code: string;
        metadata: {
            language: string;
            category: string;
            description: string;
            success: boolean;
        };
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getStats(): Promise<{
        totalTemplates: number;
        templatesByCategory: Record<string, number>;
        averageSuccessRate: number;
        mostUsedTemplates: {
            id: string;
            name: string;
            usageCount: number;
        }[];
    }>;
}
