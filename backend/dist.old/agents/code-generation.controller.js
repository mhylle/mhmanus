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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerationController = exports.RenderTemplateDto = exports.AnalyzeCodeDto = exports.GenerateProjectDto = exports.GenerateTestsDto = exports.GenerateCodeDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const template_service_1 = require("./templates/template.service");
const test_generator_service_1 = require("./testing/test-generator.service");
const project_generator_service_1 = require("./project/project-generator.service");
const code_quality_service_1 = require("./quality/code-quality.service");
class GenerateCodeDto {
    description;
    language;
    framework;
    type;
    includeTests;
}
exports.GenerateCodeDto = GenerateCodeDto;
class GenerateTestsDto {
    code;
    filePath;
    language;
    framework;
    coverage;
    includeIntegration;
}
exports.GenerateTestsDto = GenerateTestsDto;
class GenerateProjectDto {
    name;
    description;
    type;
    framework;
    features;
    language;
    includeTests;
    includeDocker;
    includeDocs;
}
exports.GenerateProjectDto = GenerateProjectDto;
class AnalyzeCodeDto {
    code;
    filePath;
    language;
}
exports.AnalyzeCodeDto = AnalyzeCodeDto;
class RenderTemplateDto {
    templateId;
    variables;
}
exports.RenderTemplateDto = RenderTemplateDto;
let CodeGenerationController = class CodeGenerationController {
    templateService;
    testGenerator;
    projectGenerator;
    codeQuality;
    constructor(templateService, testGenerator, projectGenerator, codeQuality) {
        this.templateService = templateService;
        this.testGenerator = testGenerator;
        this.projectGenerator = projectGenerator;
        this.codeQuality = codeQuality;
    }
    async generateCode(dto) {
        const templates = await this.templateService.getTemplatesByCategory(dto.type);
        if (templates.length === 0) {
            return {
                success: false,
                error: 'No templates available for this type',
            };
        }
        const template = templates[0];
        const variables = {
            className: dto.description.split(' ')[0],
            description: dto.description,
        };
        const code = await this.templateService.renderTemplate(template.id, variables);
        const result = {
            code,
            language: dto.language,
            type: dto.type,
        };
        if (dto.includeTests) {
            const tests = await this.testGenerator.generateTests({
                code,
                filePath: `generated.${dto.language === 'typescript' ? 'ts' : 'js'}`,
                language: dto.language,
                framework: 'jest',
            });
            result['tests'] = tests;
        }
        return {
            success: true,
            result,
        };
    }
    async generateTests(dto) {
        return this.testGenerator.generateTests(dto);
    }
    async generateProject(dto) {
        try {
            const project = await this.projectGenerator.generateProject(dto);
            return {
                success: true,
                project,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async analyzeCode(dto) {
        return this.codeQuality.analyzeCode(dto.code, dto.filePath, dto.language || 'typescript');
    }
    async getTemplates(category) {
        if (category) {
            return this.templateService.getTemplatesByCategory(category);
        }
        const categories = ['service', 'controller', 'entity', 'interface', 'test'];
        const templates = [];
        for (const cat of categories) {
            const categoryTemplates = await this.templateService.getTemplatesByCategory(cat);
            templates.push(...categoryTemplates);
        }
        return templates;
    }
    async searchTemplates(query) {
        return this.templateService.searchTemplates(query);
    }
    async getTemplate(id) {
        return this.templateService.getTemplate(id);
    }
    async renderTemplate(dto) {
        try {
            const code = await this.templateService.renderTemplate(dto.templateId, dto.variables);
            return {
                success: true,
                code,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async compareQuality(dto) {
        return this.codeQuality.compareWithSimilarCode(dto.code, dto.language);
    }
    async learnFromCode(dto) {
        await this.templateService.learnFromCode(dto.code, dto.metadata);
        return {
            success: true,
            message: 'Code pattern learned successfully',
        };
    }
    async getStats() {
        const templates = await this.getTemplates();
        return {
            totalTemplates: templates.length,
            templatesByCategory: templates.reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + 1;
                return acc;
            }, {}),
            averageSuccessRate: templates.reduce((sum, t) => sum + t.successRate, 0) / templates.length,
            mostUsedTemplates: templates
                .sort((a, b) => b.usageCount - a.usageCount)
                .slice(0, 5)
                .map((t) => ({ id: t.id, name: t.name, usageCount: t.usageCount })),
        };
    }
};
exports.CodeGenerationController = CodeGenerationController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate code based on description' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Code generated successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GenerateCodeDto]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "generateCode", null);
__decorate([
    (0, common_1.Post)('tests'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate tests for provided code' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tests generated successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GenerateTestsDto]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "generateTests", null);
__decorate([
    (0, common_1.Post)('project'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate complete project structure' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Project generated successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GenerateProjectDto]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "generateProject", null);
__decorate([
    (0, common_1.Post)('analyze'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Analyze code quality' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Code analysis complete' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AnalyzeCodeDto]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "analyzeCode", null);
__decorate([
    (0, common_1.Get)('templates'),
    (0, swagger_1.ApiOperation)({ summary: 'List available code templates' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false }),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Get)('templates/search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search for templates' }),
    (0, swagger_1.ApiQuery)({ name: 'q', description: 'Search query' }),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "searchTemplates", null);
__decorate([
    (0, common_1.Get)('templates/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get template by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Template ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Post)('templates/render'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Render a template with variables' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RenderTemplateDto]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "renderTemplate", null);
__decorate([
    (0, common_1.Post)('quality/compare'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Compare code quality with similar code' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "compareQuality", null);
__decorate([
    (0, common_1.Post)('learn'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Learn from successful code' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "learnFromCode", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get code generation statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CodeGenerationController.prototype, "getStats", null);
exports.CodeGenerationController = CodeGenerationController = __decorate([
    (0, swagger_1.ApiTags)('code-generation'),
    (0, common_1.Controller)('code-generation'),
    __metadata("design:paramtypes", [template_service_1.TemplateService,
        test_generator_service_1.TestGeneratorService,
        project_generator_service_1.ProjectGeneratorService,
        code_quality_service_1.CodeQualityService])
], CodeGenerationController);
//# sourceMappingURL=code-generation.controller.js.map