import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from '../../memory/memory.service';

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  category:
    | 'service'
    | 'controller'
    | 'entity'
    | 'interface'
    | 'test'
    | 'config';
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

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private templates: Map<string, CodeTemplate> = new Map();

  constructor(private readonly memoryService: MemoryService) {
    this.initializeBuiltInTemplates();
  }

  private initializeBuiltInTemplates(): void {
    // NestJS Service Template
    this.addTemplate({
      id: 'nestjs-service',
      name: 'NestJS Service',
      description: 'Standard NestJS service with dependency injection',
      language: 'typescript',
      category: 'service',
      template: `import { Injectable, Logger } from '@nestjs/common';
{{#imports}}
import { {{name}} } from '{{path}}';
{{/imports}}

@Injectable()
export class {{serviceName}}Service {
  private readonly logger = new Logger({{serviceName}}Service.name);

  constructor(
    {{#dependencies}}
    private readonly {{name}}: {{type}},
    {{/dependencies}}
  ) {}

  {{#methods}}
  async {{name}}({{parameters}}): Promise<{{returnType}}> {
    this.logger.log(\`{{description}}\`);
    {{implementation}}
  }

  {{/methods}}
}`,
      variables: [
        {
          name: 'serviceName',
          description: 'Name of the service (PascalCase)',
          type: 'string',
          required: true,
        },
        {
          name: 'imports',
          description: 'Import statements',
          type: 'array',
          required: false,
        },
        {
          name: 'dependencies',
          description: 'Constructor dependencies',
          type: 'array',
          required: false,
        },
        {
          name: 'methods',
          description: 'Service methods',
          type: 'array',
          required: true,
        },
      ],
      examples: [],
      tags: ['nestjs', 'service', 'injectable'],
      successRate: 100,
      usageCount: 0,
      lastUsed: new Date(),
    });

    // TypeScript Interface Template
    this.addTemplate({
      id: 'typescript-interface',
      name: 'TypeScript Interface',
      description: 'TypeScript interface with proper documentation',
      language: 'typescript',
      category: 'interface',
      template: `/**
 * {{description}}
 */
export interface {{interfaceName}}{{#extends}} extends {{extends}}{{/extends}} {
  {{#properties}}
  /**
   * {{description}}
   */
  {{name}}{{#optional}}?{{/optional}}: {{type}};
  
  {{/properties}}
  {{#methods}}
  /**
   * {{description}}
   */
  {{name}}({{parameters}}): {{returnType}};
  
  {{/methods}}
}`,
      variables: [
        {
          name: 'interfaceName',
          description: 'Name of the interface',
          type: 'string',
          required: true,
        },
        {
          name: 'description',
          description: 'Interface description',
          type: 'string',
          required: true,
        },
        {
          name: 'extends',
          description: 'Parent interface',
          type: 'string',
          required: false,
        },
        {
          name: 'properties',
          description: 'Interface properties',
          type: 'array',
          required: false,
        },
        {
          name: 'methods',
          description: 'Interface methods',
          type: 'array',
          required: false,
        },
      ],
      examples: [],
      tags: ['typescript', 'interface', 'types'],
      successRate: 100,
      usageCount: 0,
      lastUsed: new Date(),
    });

    // Jest Test Template
    this.addTemplate({
      id: 'jest-test',
      name: 'Jest Test Suite',
      description: 'Comprehensive Jest test suite with mocks',
      language: 'typescript',
      category: 'test',
      template: `import { Test, TestingModule } from '@nestjs/testing';
import { {{className}} } from './{{fileName}}';
{{#imports}}
import { {{name}} } from '{{path}}';
{{/imports}}

{{#mocks}}
jest.mock('{{path}}');
{{/mocks}}

describe('{{className}}', () => {
  let {{instanceName}}: {{className}};
  {{#dependencies}}
  let {{name}}: {{type}};
  {{/dependencies}}

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      {{#providers}}
      providers: [
        {{className}},
        {{#mockProviders}}
        {
          provide: {{name}},
          useValue: {
            {{#methods}}
            {{name}}: jest.fn(),
            {{/methods}}
          },
        },
        {{/mockProviders}}
      ],
      {{/providers}}
    }).compile();

    {{instanceName}} = module.get<{{className}}>({{className}});
    {{#dependencies}}
    {{name}} = module.get<{{type}}>({{type}});
    {{/dependencies}}
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('{{methodName}}', () => {
    {{#tests}}
    it('{{description}}', async () => {
      // Arrange
      {{arrange}}

      // Act
      {{act}}

      // Assert
      {{assert}}
    });

    {{/tests}}
  });
});`,
      variables: [
        {
          name: 'className',
          description: 'Class being tested',
          type: 'string',
          required: true,
        },
        {
          name: 'fileName',
          description: 'File name without extension',
          type: 'string',
          required: true,
        },
        {
          name: 'instanceName',
          description: 'Variable name for instance',
          type: 'string',
          required: true,
        },
        {
          name: 'tests',
          description: 'Test cases',
          type: 'array',
          required: true,
        },
      ],
      examples: [],
      tags: ['jest', 'testing', 'unit-test'],
      successRate: 100,
      usageCount: 0,
      lastUsed: new Date(),
    });

    // TypeORM Entity Template
    this.addTemplate({
      id: 'typeorm-entity',
      name: 'TypeORM Entity',
      description: 'TypeORM entity with common columns',
      language: 'typescript',
      category: 'entity',
      template: `import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  {{#relations}}
  {{relationType}},
  {{/relations}}
} from 'typeorm';
{{#imports}}
import { {{name}} } from '{{path}}';
{{/imports}}

@Entity('{{tableName}}')
export class {{entityName}} {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  {{#columns}}
  @Column({{#options}}{ {{options}} }{{/options}})
  {{name}}: {{type}};

  {{/columns}}
  {{#relations}}
  @{{relationType}}(() => {{targetEntity}}{{#options}}, { {{options}} }{{/options}})
  {{name}}: {{type}};

  {{/relations}}
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}`,
      variables: [
        {
          name: 'entityName',
          description: 'Entity class name',
          type: 'string',
          required: true,
        },
        {
          name: 'tableName',
          description: 'Database table name',
          type: 'string',
          required: true,
        },
        {
          name: 'columns',
          description: 'Entity columns',
          type: 'array',
          required: true,
        },
        {
          name: 'relations',
          description: 'Entity relations',
          type: 'array',
          required: false,
        },
      ],
      examples: [],
      tags: ['typeorm', 'entity', 'database'],
      successRate: 100,
      usageCount: 0,
      lastUsed: new Date(),
    });
  }

  private addTemplate(template: CodeTemplate): void {
    this.templates.set(template.id, template);
    this.logger.log(`Added template: ${template.name}`);
  }

  async getTemplate(id: string): Promise<CodeTemplate | null> {
    return this.templates.get(id) || null;
  }

  async getTemplatesByCategory(category: string): Promise<CodeTemplate[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.category === category,
    );
  }

  async searchTemplates(query: string): Promise<CodeTemplate[]> {
    const results: CodeTemplate[] = [];

    // Search in memory for similar templates
    const similar = await this.memoryService.semantic.searchSimilar(
      `code template ${query}`,
      10,
    );

    // Match with local templates
    for (const template of this.templates.values()) {
      const score = this.calculateRelevance(template, query, similar);
      if (score > 0.5) {
        results.push(template);
      }
    }

    return results.sort((a, b) => b.successRate - a.successRate);
  }

  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
  ): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && !variables[variable.name]) {
        throw new Error(`Required variable '${variable.name}' not provided`);
      }
    }

    // Simple template rendering (in production, use proper template engine)
    let rendered = template.template;

    // Handle array iterations
    const arrayPattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    rendered = rendered.replace(arrayPattern, (match, varName, content) => {
      const array = variables[varName];
      if (!Array.isArray(array)) return '';

      return array
        .map((item) => {
          let itemContent = content;
          Object.keys(item).forEach((key) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            itemContent = itemContent.replace(regex, item[key] || '');
          });
          return itemContent;
        })
        .join('');
    });

    // Handle simple variable replacements
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, variables[key] || '');
    });

    // Handle optional sections
    const optionalPattern = /\{\{#(\w+)\?\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    rendered = rendered.replace(optionalPattern, (match, varName, content) => {
      return variables[varName] ? content : '';
    });

    // Update template usage
    template.usageCount++;
    template.lastUsed = new Date();

    // Store successful usage in memory
    await this.storeTemplateUsage(template, variables, rendered);

    return rendered;
  }

  async learnFromCode(
    code: string,
    metadata: {
      language: string;
      category: string;
      description: string;
      success: boolean;
    },
  ): Promise<void> {
    if (!metadata.success) return;

    // Extract patterns from successful code
    const patterns = this.extractTemplatePatterns(code, metadata);

    for (const pattern of patterns) {
      // Check if similar template exists
      const existing = Array.from(this.templates.values()).find((t) =>
        this.isSimilarTemplate(t, pattern),
      );

      if (existing) {
        // Update existing template
        existing.examples.push(code.substring(0, 500));
        existing.successRate =
          (existing.successRate * existing.usageCount + 100) /
          (existing.usageCount + 1);
        existing.usageCount++;
      } else {
        // Create new template from pattern
        this.addTemplate(pattern);
      }
    }
  }

  private calculateRelevance(
    template: CodeTemplate,
    query: string,
    similarResults: any[],
  ): number {
    let score = 0;

    // Name match
    if (template.name.toLowerCase().includes(query.toLowerCase())) {
      score += 0.3;
    }

    // Tag match
    const queryWords = query.toLowerCase().split(' ');
    const tagMatches = template.tags.filter((tag) =>
      queryWords.some((word) => tag.includes(word)),
    ).length;
    score += tagMatches * 0.1;

    // Description match
    if (template.description.toLowerCase().includes(query.toLowerCase())) {
      score += 0.2;
    }

    // Semantic similarity
    const semanticMatch = similarResults.find((r) =>
      r.metadata.tags?.some((tag) => template.tags.includes(tag)),
    );
    if (semanticMatch) {
      score += semanticMatch.similarity * 0.4;
    }

    return Math.min(score, 1);
  }

  private async storeTemplateUsage(
    template: CodeTemplate,
    variables: Record<string, any>,
    rendered: string,
  ): Promise<void> {
    // Store in semantic memory for future similarity search
    await this.memoryService.semantic.storeEmbedding(rendered, {
      type: 'code',
      source: `template:${template.id}`,
      tags: [...template.tags, 'generated'],
      timestamp: new Date(),
    });

    // Store as code snippet
    await this.memoryService.longTerm.storeCodeSnippet({
      id: `snippet-${Date.now()}`,
      language: template.language,
      purpose: `Generated from template: ${template.name}`,
      code: rendered,
      tags: template.tags,
      usageCount: 1,
      successRate: 100,
      createdAt: new Date(),
      lastUsed: new Date(),
    });
  }

  private extractTemplatePatterns(code: string, metadata: any): CodeTemplate[] {
    const patterns: CodeTemplate[] = [];

    // Simple pattern extraction based on code structure
    // In production, use proper AST analysis

    if (code.includes('@Injectable()') && code.includes('class')) {
      patterns.push(
        this.createTemplateFromCode(code, {
          ...metadata,
          name: 'Extracted Service Pattern',
          category: 'service',
        }),
      );
    }

    if (code.includes('interface') && code.includes('export')) {
      patterns.push(
        this.createTemplateFromCode(code, {
          ...metadata,
          name: 'Extracted Interface Pattern',
          category: 'interface',
        }),
      );
    }

    return patterns;
  }

  private createTemplateFromCode(code: string, metadata: any): CodeTemplate {
    // Extract variables from code
    const variables = this.extractVariables(code);

    return {
      id: `learned-${Date.now()}`,
      name: metadata.name,
      description: metadata.description,
      language: metadata.language,
      category: metadata.category,
      template: this.templatize(code),
      variables,
      examples: [code],
      tags: this.extractTags(code, metadata),
      successRate: 100,
      usageCount: 1,
      lastUsed: new Date(),
    };
  }

  private extractVariables(code: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];

    // Extract class names
    const classMatch = code.match(/class\s+(\w+)/);
    if (classMatch) {
      variables.push({
        name: 'className',
        description: 'Main class name',
        type: 'string',
        required: true,
      });
    }

    // Extract interface names
    const interfaceMatch = code.match(/interface\s+(\w+)/);
    if (interfaceMatch) {
      variables.push({
        name: 'interfaceName',
        description: 'Main interface name',
        type: 'string',
        required: true,
      });
    }

    return variables;
  }

  private templatize(code: string): string {
    // Convert specific names to template variables
    let template = code;

    // Replace class names
    template = template.replace(/class\s+\w+/, 'class {{className}}');

    // Replace interface names
    template = template.replace(
      /interface\s+\w+/,
      'interface {{interfaceName}}',
    );

    return template;
  }

  private extractTags(code: string, metadata: any): string[] {
    const tags: string[] = [metadata.language, metadata.category];

    if (code.includes('@Injectable')) tags.push('injectable');
    if (code.includes('async')) tags.push('async');
    if (code.includes('Observable')) tags.push('reactive');
    if (code.includes('test')) tags.push('test');

    return [...new Set(tags)];
  }

  private isSimilarTemplate(t1: CodeTemplate, t2: CodeTemplate): boolean {
    // Check if templates are similar enough to merge
    return (
      t1.category === t2.category &&
      t1.language === t2.language &&
      this.calculateTemplateSimilarity(t1.template, t2.template) > 0.8
    );
  }

  private calculateTemplateSimilarity(t1: string, t2: string): number {
    // Simple similarity based on common lines
    const lines1 = t1
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);
    const lines2 = t2
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);

    const common = lines1.filter((l) => lines2.includes(l)).length;
    const total = Math.max(lines1.length, lines2.length);

    return total > 0 ? common / total : 0;
  }
}
