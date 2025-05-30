import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TemplateService, CodeTemplate } from './templates/template.service';
import {
  TestGeneratorService,
  TestGenerationRequest,
  GeneratedTest,
} from './testing/test-generator.service';
import {
  ProjectGeneratorService,
  ProjectGenerationRequest,
  GeneratedProject,
} from './project/project-generator.service';
import {
  CodeQualityService,
  CodeQualityAnalysis,
} from './quality/code-quality.service';

// DTOs
export class GenerateCodeDto {
  description: string;
  language: string;
  framework?: string;
  type: 'function' | 'class' | 'interface' | 'service' | 'component';
  includeTests?: boolean;
}

export class GenerateTestsDto implements TestGenerationRequest {
  code: string;
  filePath: string;
  language: string;
  framework?: 'jest' | 'jasmine' | 'mocha' | 'vitest';
  coverage?: 'basic' | 'comprehensive' | 'edge-cases';
  includeIntegration?: boolean;
}

export class GenerateProjectDto implements ProjectGenerationRequest {
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

export class AnalyzeCodeDto {
  code: string;
  filePath: string;
  language?: string;
}

export class RenderTemplateDto {
  templateId: string;
  variables: Record<string, any>;
}

@ApiTags('code-generation')
@Controller('code-generation')
export class CodeGenerationController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly testGenerator: TestGeneratorService,
    private readonly projectGenerator: ProjectGeneratorService,
    private readonly codeQuality: CodeQualityService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate code based on description' })
  @ApiResponse({ status: 200, description: 'Code generated successfully' })
  async generateCode(@Body() dto: GenerateCodeDto) {
    // This would typically use the CodeAgent, but for now we'll use templates
    const templates = await this.templateService.getTemplatesByCategory(
      dto.type,
    );

    if (templates.length === 0) {
      return {
        success: false,
        error: 'No templates available for this type',
      };
    }

    // Simple template selection
    const template = templates[0];
    const variables = {
      className: dto.description.split(' ')[0],
      description: dto.description,
    };

    const code = await this.templateService.renderTemplate(
      template.id,
      variables,
    );

    const result = {
      code,
      language: dto.language,
      type: dto.type,
    };

    // Generate tests if requested
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

  @Post('tests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate tests for provided code' })
  @ApiResponse({ status: 200, description: 'Tests generated successfully' })
  async generateTests(@Body() dto: GenerateTestsDto): Promise<GeneratedTest> {
    return this.testGenerator.generateTests(dto);
  }

  @Post('project')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate complete project structure' })
  @ApiResponse({ status: 200, description: 'Project generated successfully' })
  async generateProject(@Body() dto: GenerateProjectDto): Promise<{
    success: boolean;
    project?: GeneratedProject;
    error?: string;
  }> {
    try {
      const project = await this.projectGenerator.generateProject(dto);
      return {
        success: true,
        project,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze code quality' })
  @ApiResponse({ status: 200, description: 'Code analysis complete' })
  async analyzeCode(@Body() dto: AnalyzeCodeDto): Promise<CodeQualityAnalysis> {
    return this.codeQuality.analyzeCode(
      dto.code,
      dto.filePath,
      dto.language || 'typescript',
    );
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available code templates' })
  @ApiQuery({ name: 'category', required: false })
  async getTemplates(
    @Query('category') category?: string,
  ): Promise<CodeTemplate[]> {
    if (category) {
      return this.templateService.getTemplatesByCategory(category);
    }

    // Get all templates
    const categories = ['service', 'controller', 'entity', 'interface', 'test'];
    const templates: CodeTemplate[] = [];

    for (const cat of categories) {
      const categoryTemplates =
        await this.templateService.getTemplatesByCategory(cat);
      templates.push(...categoryTemplates);
    }

    return templates;
  }

  @Get('templates/search')
  @ApiOperation({ summary: 'Search for templates' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  async searchTemplates(@Query('q') query: string): Promise<CodeTemplate[]> {
    return this.templateService.searchTemplates(query);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  async getTemplate(@Param('id') id: string): Promise<CodeTemplate | null> {
    return this.templateService.getTemplate(id);
  }

  @Post('templates/render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Render a template with variables' })
  async renderTemplate(@Body() dto: RenderTemplateDto): Promise<{
    success: boolean;
    code?: string;
    error?: string;
  }> {
    try {
      const code = await this.templateService.renderTemplate(
        dto.templateId,
        dto.variables,
      );
      return {
        success: true,
        code,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('quality/compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare code quality with similar code' })
  async compareQuality(@Body() dto: { code: string; language: string }) {
    return this.codeQuality.compareWithSimilarCode(dto.code, dto.language);
  }

  @Post('learn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Learn from successful code' })
  async learnFromCode(
    @Body()
    dto: {
      code: string;
      metadata: {
        language: string;
        category: string;
        description: string;
        success: boolean;
      };
    },
  ) {
    await this.templateService.learnFromCode(dto.code, dto.metadata);
    return {
      success: true,
      message: 'Code pattern learned successfully',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get code generation statistics' })
  async getStats() {
    // This would aggregate stats from various services
    const templates = await this.getTemplates();

    return {
      totalTemplates: templates.length,
      templatesByCategory: templates.reduce(
        (acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      averageSuccessRate:
        templates.reduce((sum, t) => sum + t.successRate, 0) / templates.length,
      mostUsedTemplates: templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map((t) => ({ id: t.id, name: t.name, usageCount: t.usageCount })),
    };
  }
}
