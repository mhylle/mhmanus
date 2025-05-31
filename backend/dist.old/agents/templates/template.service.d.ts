import { MemoryService } from '../../memory/memory.service';
export interface CodeTemplate {
    id: string;
    name: string;
    description: string;
    language: string;
    category: 'service' | 'controller' | 'entity' | 'interface' | 'test' | 'config';
    template: string;
    variables: TemplateVariable[];
    examples: string[];
    tags: string[];
    successRate: number;
    usageCount: number;
    lastUsed: Date;
}
export interface TemplateVariable {
    name: string;
    description: string;
    type: 'string' | 'boolean' | 'array' | 'object';
    required: boolean;
    default?: any;
    validation?: string;
}
export declare class TemplateService {
    private readonly memoryService;
    private readonly logger;
    private templates;
    constructor(memoryService: MemoryService);
    private initializeBuiltInTemplates;
    private addTemplate;
    getTemplate(id: string): Promise<CodeTemplate | null>;
    getTemplatesByCategory(category: string): Promise<CodeTemplate[]>;
    searchTemplates(query: string): Promise<CodeTemplate[]>;
    renderTemplate(templateId: string, variables: Record<string, any>): Promise<string>;
    learnFromCode(code: string, metadata: {
        language: string;
        category: string;
        description: string;
        success: boolean;
    }): Promise<void>;
    private calculateRelevance;
    private storeTemplateUsage;
    private extractTemplatePatterns;
    private createTemplateFromCode;
    private extractVariables;
    private templatize;
    private extractTags;
    private isSimilarTemplate;
    private calculateTemplateSimilarity;
}
