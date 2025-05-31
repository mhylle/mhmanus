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
var TemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const common_1 = require("@nestjs/common");
const memory_service_1 = require("../../memory/memory.service");
let TemplateService = TemplateService_1 = class TemplateService {
    memoryService;
    logger = new common_1.Logger(TemplateService_1.name);
    templates = new Map();
    constructor(memoryService) {
        this.memoryService = memoryService;
        this.initializeBuiltInTemplates();
    }
    initializeBuiltInTemplates() {
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
    addTemplate(template) {
        this.templates.set(template.id, template);
        this.logger.log(`Added template: ${template.name}`);
    }
    async getTemplate(id) {
        return this.templates.get(id) || null;
    }
    async getTemplatesByCategory(category) {
        return Array.from(this.templates.values()).filter((t) => t.category === category);
    }
    async searchTemplates(query) {
        const results = [];
        const similar = await this.memoryService.semantic.searchSimilar(`code template ${query}`, 10);
        for (const template of this.templates.values()) {
            const score = this.calculateRelevance(template, query, similar);
            if (score > 0.5) {
                results.push(template);
            }
        }
        return results.sort((a, b) => b.successRate - a.successRate);
    }
    async renderTemplate(templateId, variables) {
        const template = await this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        for (const variable of template.variables) {
            if (variable.required && !variables[variable.name]) {
                throw new Error(`Required variable '${variable.name}' not provided`);
            }
        }
        let rendered = template.template;
        const arrayPattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
        rendered = rendered.replace(arrayPattern, (match, varName, content) => {
            const array = variables[varName];
            if (!Array.isArray(array))
                return '';
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
        Object.keys(variables).forEach((key) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            rendered = rendered.replace(regex, variables[key] || '');
        });
        const optionalPattern = /\{\{#(\w+)\?\}\}([\s\S]*?)\{\{\/\1\}\}/g;
        rendered = rendered.replace(optionalPattern, (match, varName, content) => {
            return variables[varName] ? content : '';
        });
        template.usageCount++;
        template.lastUsed = new Date();
        await this.storeTemplateUsage(template, variables, rendered);
        return rendered;
    }
    async learnFromCode(code, metadata) {
        if (!metadata.success)
            return;
        const patterns = this.extractTemplatePatterns(code, metadata);
        for (const pattern of patterns) {
            const existing = Array.from(this.templates.values()).find((t) => this.isSimilarTemplate(t, pattern));
            if (existing) {
                existing.examples.push(code.substring(0, 500));
                existing.successRate =
                    (existing.successRate * existing.usageCount + 100) /
                        (existing.usageCount + 1);
                existing.usageCount++;
            }
            else {
                this.addTemplate(pattern);
            }
        }
    }
    calculateRelevance(template, query, similarResults) {
        let score = 0;
        if (template.name.toLowerCase().includes(query.toLowerCase())) {
            score += 0.3;
        }
        const queryWords = query.toLowerCase().split(' ');
        const tagMatches = template.tags.filter((tag) => queryWords.some((word) => tag.includes(word))).length;
        score += tagMatches * 0.1;
        if (template.description.toLowerCase().includes(query.toLowerCase())) {
            score += 0.2;
        }
        const semanticMatch = similarResults.find((r) => r.metadata.tags?.some((tag) => template.tags.includes(tag)));
        if (semanticMatch) {
            score += semanticMatch.similarity * 0.4;
        }
        return Math.min(score, 1);
    }
    async storeTemplateUsage(template, variables, rendered) {
        await this.memoryService.semantic.storeEmbedding(rendered, {
            type: 'code',
            source: `template:${template.id}`,
            tags: [...template.tags, 'generated'],
            timestamp: new Date(),
        });
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
    extractTemplatePatterns(code, metadata) {
        const patterns = [];
        if (code.includes('@Injectable()') && code.includes('class')) {
            patterns.push(this.createTemplateFromCode(code, {
                ...metadata,
                name: 'Extracted Service Pattern',
                category: 'service',
            }));
        }
        if (code.includes('interface') && code.includes('export')) {
            patterns.push(this.createTemplateFromCode(code, {
                ...metadata,
                name: 'Extracted Interface Pattern',
                category: 'interface',
            }));
        }
        return patterns;
    }
    createTemplateFromCode(code, metadata) {
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
    extractVariables(code) {
        const variables = [];
        const classMatch = code.match(/class\s+(\w+)/);
        if (classMatch) {
            variables.push({
                name: 'className',
                description: 'Main class name',
                type: 'string',
                required: true,
            });
        }
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
    templatize(code) {
        let template = code;
        template = template.replace(/class\s+\w+/, 'class {{className}}');
        template = template.replace(/interface\s+\w+/, 'interface {{interfaceName}}');
        return template;
    }
    extractTags(code, metadata) {
        const tags = [metadata.language, metadata.category];
        if (code.includes('@Injectable'))
            tags.push('injectable');
        if (code.includes('async'))
            tags.push('async');
        if (code.includes('Observable'))
            tags.push('reactive');
        if (code.includes('test'))
            tags.push('test');
        return [...new Set(tags)];
    }
    isSimilarTemplate(t1, t2) {
        return (t1.category === t2.category &&
            t1.language === t2.language &&
            this.calculateTemplateSimilarity(t1.template, t2.template) > 0.8);
    }
    calculateTemplateSimilarity(t1, t2) {
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
};
exports.TemplateService = TemplateService;
exports.TemplateService = TemplateService = TemplateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [memory_service_1.MemoryService])
], TemplateService);
//# sourceMappingURL=template.service.js.map