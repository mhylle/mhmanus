import { LLMService } from '../../llm/llm.service';
import { MemoryService } from '../../memory/memory.service';
import { TemplateService } from '../templates/template.service';
import { TestGeneratorService } from '../testing/test-generator.service';
export interface ProjectGenerationRequest {
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
export interface ProjectStructure {
    name: string;
    type: 'file' | 'directory';
    path: string;
    content?: string;
    children?: ProjectStructure[];
}
export interface GeneratedProject {
    structure: ProjectStructure;
    files: Map<string, string>;
    documentation: string;
    setupInstructions: string;
    estimatedComplexity: number;
}
export declare class ProjectGeneratorService {
    private readonly llmService;
    private readonly memoryService;
    private readonly templateService;
    private readonly testGenerator;
    private readonly logger;
    constructor(llmService: LLMService, memoryService: MemoryService, templateService: TemplateService, testGenerator: TestGeneratorService);
    generateProject(request: ProjectGenerationRequest): Promise<GeneratedProject>;
    private getSimilarProjects;
    private extractCommonStructures;
    private createProjectPlan;
    private createDefaultProjectPlan;
    private generateProjectStructure;
    private addDirectoryToStructure;
    private addFileToStructure;
    private addStandardFiles;
    private generateProjectFiles;
    private generateFilesRecursive;
    private generateFileContent;
    private generatePackageJson;
    private generateTsConfig;
    private generateReadme;
    private generateGitignore;
    private generateDockerfile;
    private generateDockerCompose;
    private generateCIConfig;
    private generateCodeFile;
    private determineFileType;
    private determineFilePurpose;
    private prepareTemplateVariables;
    private generateDefaultMethods;
    private generateDefaultProperties;
    private generateCodeWithLLM;
    private extractCode;
    private generateProjectTests;
    private shouldGenerateTest;
    private generateDocumentation;
    private structureToString;
    private generateSetupInstructions;
    private calculateComplexity;
    private storeProjectGeneration;
}
