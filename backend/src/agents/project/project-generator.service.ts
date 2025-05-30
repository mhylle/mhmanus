import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class ProjectGeneratorService {
  private readonly logger = new Logger(ProjectGeneratorService.name);

  constructor(
    private readonly llmService: LLMService,
    private readonly memoryService: MemoryService,
    private readonly templateService: TemplateService,
    private readonly testGenerator: TestGeneratorService,
  ) {}

  async generateProject(
    request: ProjectGenerationRequest,
  ): Promise<GeneratedProject> {
    this.logger.log(`Generating ${request.type} project: ${request.name}`);

    // Get similar projects from memory
    const similarProjects = await this.getSimilarProjects(request);

    // Create project plan
    const projectPlan = await this.createProjectPlan(request, similarProjects);

    // Generate project structure
    const structure = await this.generateProjectStructure(projectPlan);

    // Generate files
    const files = await this.generateProjectFiles(
      structure,
      projectPlan,
      request,
    );

    // Generate tests if requested
    if (request.includeTests) {
      await this.generateProjectTests(files, request);
    }

    // Generate documentation
    const documentation = await this.generateDocumentation(request, structure);

    // Store successful project generation
    await this.storeProjectGeneration(request, files);

    return {
      structure,
      files,
      documentation,
      setupInstructions: this.generateSetupInstructions(request, projectPlan),
      estimatedComplexity: this.calculateComplexity(files),
    };
  }

  private async getSimilarProjects(
    request: ProjectGenerationRequest,
  ): Promise<any> {
    // Search for similar project structures
    const similar = await this.memoryService.semantic.searchSimilar(
      `${request.type} project ${request.framework || ''} ${request.features.join(' ')}`,
      5,
    );

    // Get successful project patterns
    const patterns =
      await this.memoryService.longTerm.getPatterns('project_structure');

    return {
      projects: similar.filter((s) => s.metadata.tags?.includes('project')),
      patterns,
      commonStructures: this.extractCommonStructures(similar),
    };
  }

  private extractCommonStructures(similar: any[]): any {
    // Extract common directory structures from similar projects
    const structures = {
      directories: new Set<string>(),
      files: new Set<string>(),
      patterns: [],
    };

    for (const item of similar) {
      if (item.metadata.tags?.includes('project') && item.content) {
        // Simple extraction - in production, parse actual structure
        const dirs = item.content.match(/\/\w+\//g) || [];
        dirs.forEach((d) => structures.directories.add(d));
      }
    }

    return structures;
  }

  private async createProjectPlan(
    request: ProjectGenerationRequest,
    similarProjects: any,
  ): Promise<any> {
    const prompt = `Create a detailed project plan for:

Project: ${request.name}
Type: ${request.type}
Description: ${request.description}
Framework: ${request.framework || 'None specified'}
Features: ${request.features.join(', ')}
Language: ${request.language}

${
  similarProjects.patterns.length > 0
    ? `
Successful project patterns:
${similarProjects.patterns.map((p) => `- ${p.description}`).join('\n')}
`
    : ''
}

Generate a comprehensive plan including:
1. Directory structure
2. Core files to generate
3. Dependencies required
4. Configuration files
5. Entry points
6. Module organization

Format as JSON with clear structure.`;

    const response = await this.llmService.generateCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a software architect expert in project structure and organization.',
        },
        { role: 'user', content: prompt },
      ],
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return this.createDefaultProjectPlan(request);
    }
  }

  private createDefaultProjectPlan(request: ProjectGenerationRequest): any {
    const basePlan = {
      directories: ['src', 'tests', 'docs'] as string[],
      coreFiles: [] as string[],
      dependencies: {} as Record<string, string>,
      devDependencies: {} as Record<string, string>,
      scripts: {} as Record<string, string>,
    };

    switch (request.type) {
      case 'api':
        basePlan.directories.push(
          'src/routes',
          'src/controllers',
          'src/services',
          'src/models',
        );
        basePlan.coreFiles.push('src/index.ts', 'src/app.ts', 'src/config.ts');
        basePlan.dependencies = { express: '^4.18.0' };
        break;

      case 'library':
        basePlan.directories.push('src/lib', 'src/types');
        basePlan.coreFiles.push('src/index.ts', 'src/lib/core.ts');
        break;

      case 'microservice':
        basePlan.directories.push('src/handlers', 'src/services', 'src/utils');
        basePlan.coreFiles.push('src/index.ts', 'src/server.ts');
        break;
    }

    return basePlan;
  }

  private async generateProjectStructure(
    projectPlan: any,
  ): Promise<ProjectStructure> {
    const root: ProjectStructure = {
      name: projectPlan.name || 'project',
      type: 'directory',
      path: '.',
      children: [],
    };

    // Add directories
    for (const dir of projectPlan.directories || []) {
      this.addDirectoryToStructure(root, dir);
    }

    // Add core files
    for (const file of projectPlan.coreFiles || []) {
      this.addFileToStructure(root, file);
    }

    // Add standard files
    this.addStandardFiles(root, projectPlan);

    return root;
  }

  private addDirectoryToStructure(root: ProjectStructure, path: string): void {
    const parts = path.split('/').filter((p) => p);
    let current = root;

    for (const part of parts) {
      let child = current.children?.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          type: 'directory',
          path: current.path === '.' ? part : `${current.path}/${part}`,
          children: [],
        };
        current.children = current.children || [];
        current.children.push(child);
      }
      current = child;
    }
  }

  private addFileToStructure(root: ProjectStructure, path: string): void {
    const parts = path.split('/').filter((p) => p);
    const fileName = parts.pop()!;
    let current = root;

    // Navigate to parent directory
    for (const part of parts) {
      let child = current.children?.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          type: 'directory',
          path: current.path === '.' ? part : `${current.path}/${part}`,
          children: [],
        };
        current.children = current.children || [];
        current.children.push(child);
      }
      current = child;
    }

    // Add file
    const file: ProjectStructure = {
      name: fileName,
      type: 'file',
      path: current.path === '.' ? fileName : `${current.path}/${fileName}`,
    };
    current.children = current.children || [];
    current.children.push(file);
  }

  private addStandardFiles(root: ProjectStructure, projectPlan: any): void {
    // Add package.json
    this.addFileToStructure(root, 'package.json');

    // Add TypeScript config
    this.addFileToStructure(root, 'tsconfig.json');

    // Add README
    this.addFileToStructure(root, 'README.md');

    // Add .gitignore
    this.addFileToStructure(root, '.gitignore');

    // Add Docker files if requested
    if (projectPlan.includeDocker) {
      this.addFileToStructure(root, 'Dockerfile');
      this.addFileToStructure(root, 'docker-compose.yml');
    }

    // Add CI/CD
    this.addDirectoryToStructure(root, '.github/workflows');
    this.addFileToStructure(root, '.github/workflows/ci.yml');
  }

  private async generateProjectFiles(
    structure: ProjectStructure,
    projectPlan: any,
    request: ProjectGenerationRequest,
  ): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    // Generate each file in the structure
    await this.generateFilesRecursive(structure, files, projectPlan, request);

    return files;
  }

  private async generateFilesRecursive(
    node: ProjectStructure,
    files: Map<string, string>,
    projectPlan: any,
    request: ProjectGenerationRequest,
  ): Promise<void> {
    if (node.type === 'file') {
      const content = await this.generateFileContent(
        node.path,
        projectPlan,
        request,
      );
      files.set(node.path, content);
    } else if (node.children) {
      for (const child of node.children) {
        await this.generateFilesRecursive(child, files, projectPlan, request);
      }
    }
  }

  private async generateFileContent(
    filePath: string,
    projectPlan: any,
    request: ProjectGenerationRequest,
  ): Promise<string> {
    const fileName = filePath.split('/').pop()!;

    // Handle special files
    switch (fileName) {
      case 'package.json':
        return this.generatePackageJson(request, projectPlan);

      case 'tsconfig.json':
        return this.generateTsConfig(request);

      case 'README.md':
        return this.generateReadme(request);

      case '.gitignore':
        return this.generateGitignore(request);

      case 'Dockerfile':
        return this.generateDockerfile(request);

      case 'docker-compose.yml':
        return this.generateDockerCompose(request);

      case 'ci.yml':
        return this.generateCIConfig(request);
    }

    // Generate code files based on type and location
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      return this.generateCodeFile(filePath, projectPlan, request);
    }

    return '// Generated file';
  }

  private generatePackageJson(
    request: ProjectGenerationRequest,
    projectPlan: any,
  ): string {
    const packageJson = {
      name: request.name.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: request.description,
      main: projectPlan.main || 'dist/index.js',
      scripts: {
        build: 'tsc',
        start: 'node dist/index.js',
        dev: 'ts-node src/index.ts',
        test: 'jest',
        lint: 'eslint src --ext .ts',
        ...projectPlan.scripts,
      },
      keywords: request.features,
      author: '',
      license: 'MIT',
      dependencies: projectPlan.dependencies || {},
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
        'ts-node': '^10.0.0',
        jest: '^29.0.0',
        '@types/jest': '^29.0.0',
        eslint: '^8.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        ...projectPlan.devDependencies,
      },
    };

    return JSON.stringify(packageJson, null, 2);
  }

  private generateTsConfig(request: ProjectGenerationRequest): string {
    const config = {
      compilerOptions: {
        target: 'ES2022',
        module: 'commonjs',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.spec.ts'],
    };

    if (request.type === 'library') {
      config.compilerOptions.declaration = true;
      config.compilerOptions.declarationMap = true;
    }

    return JSON.stringify(config, null, 2);
  }

  private generateReadme(request: ProjectGenerationRequest): string {
    return `# ${request.name}

${request.description}

## Features

${request.features.map((f) => `- ${f}`).join('\n')}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`typescript
// Example usage
import { ${request.name.replace(/\s+/g, '')} } from './${request.name.toLowerCase().replace(/\s+/g, '-')}';

// Your code here
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## Building

\`\`\`bash
npm run build
\`\`\`

## License

MIT`;
  }

  private generateGitignore(request: ProjectGenerationRequest): string {
    return `# Dependencies
node_modules/

# Build output
dist/
build/
*.js
*.js.map
*.d.ts

# IDE
.idea/
.vscode/
*.swp
*.swo

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
.cache/`;
  }

  private generateDockerfile(request: ProjectGenerationRequest): string {
    return `FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]`;
  }

  private generateDockerCompose(request: ProjectGenerationRequest): string {
    return `version: '3.8'

services:
  ${request.name.toLowerCase().replace(/\s+/g, '-')}:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped`;
  }

  private generateCIConfig(request: ProjectGenerationRequest): string {
    return `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
    - run: npm test
    - run: npm run lint`;
  }

  private async generateCodeFile(
    filePath: string,
    projectPlan: any,
    request: ProjectGenerationRequest,
  ): Promise<string> {
    // Determine file type and purpose
    const fileType = this.determineFileType(filePath);
    const purpose = this.determineFilePurpose(filePath, fileType);

    // Check for applicable templates
    const templates =
      await this.templateService.getTemplatesByCategory(fileType);

    if (templates.length > 0) {
      // Use template
      const template = templates[0];
      const variables = this.prepareTemplateVariables(
        filePath,
        request,
        projectPlan,
      );
      return this.templateService.renderTemplate(template.id, variables);
    }

    // Generate using LLM
    return this.generateCodeWithLLM(filePath, purpose, request, projectPlan);
  }

  private determineFileType(filePath: string): string {
    if (filePath.includes('controller')) return 'controller';
    if (filePath.includes('service')) return 'service';
    if (filePath.includes('model') || filePath.includes('entity'))
      return 'entity';
    if (filePath.includes('interface') || filePath.includes('types'))
      return 'interface';
    if (filePath.includes('config')) return 'config';
    if (filePath.includes('test') || filePath.includes('spec')) return 'test';
    return 'generic';
  }

  private determineFilePurpose(filePath: string, fileType: string): string {
    const fileName = filePath
      .split('/')
      .pop()!
      .replace(/\.[^.]+$/, '');
    const parts = filePath.split('/').filter((p) => p && p !== 'src');

    return `${fileType} for ${fileName} in ${parts.join('/')}`;
  }

  private prepareTemplateVariables(
    filePath: string,
    request: ProjectGenerationRequest,
    projectPlan: any,
  ): Record<string, any> {
    const fileName = filePath
      .split('/')
      .pop()!
      .replace(/\.[^.]+$/, '');
    const className = fileName.charAt(0).toUpperCase() + fileName.slice(1);

    return {
      serviceName: className,
      interfaceName: `I${className}`,
      entityName: className,
      fileName,
      description: `${className} for ${request.name}`,
      imports: [],
      dependencies: [],
      methods: this.generateDefaultMethods(filePath),
      properties: this.generateDefaultProperties(filePath),
    };
  }

  private generateDefaultMethods(filePath: string): any[] {
    if (filePath.includes('service')) {
      return [
        {
          name: 'create',
          parameters: 'data: CreateDto',
          returnType: 'Promise<Entity>',
          description: 'Create a new entity',
          implementation: 'throw new Error("Not implemented");',
        },
        {
          name: 'findAll',
          parameters: '',
          returnType: 'Promise<Entity[]>',
          description: 'Find all entities',
          implementation: 'throw new Error("Not implemented");',
        },
      ];
    }
    return [];
  }

  private generateDefaultProperties(filePath: string): any[] {
    if (filePath.includes('interface') || filePath.includes('entity')) {
      return [
        {
          name: 'id',
          type: 'string',
          description: 'Unique identifier',
          optional: false,
        },
        {
          name: 'createdAt',
          type: 'Date',
          description: 'Creation timestamp',
          optional: false,
        },
      ];
    }
    return [];
  }

  private async generateCodeWithLLM(
    filePath: string,
    purpose: string,
    request: ProjectGenerationRequest,
    projectPlan: any,
  ): Promise<string> {
    const prompt = `Generate ${request.language} code for:
File: ${filePath}
Purpose: ${purpose}
Project: ${request.name} (${request.type})
Features: ${request.features.join(', ')}

Requirements:
- Follow ${request.language} best practices
- Include proper typing
- Add appropriate comments
- Make it production-ready`;

    const response = await this.llmService.generateCompletion({
      messages: [
        {
          role: 'system',
          content: `You are an expert ${request.language} developer.`,
        },
        { role: 'user', content: prompt },
      ],
    });

    return this.extractCode(response.content);
  }

  private extractCode(response: string): string {
    const codeMatch = response.match(
      /```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/,
    );
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    return response.trim();
  }

  private async generateProjectTests(
    files: Map<string, string>,
    request: ProjectGenerationRequest,
  ): Promise<void> {
    for (const [filePath, content] of files) {
      if (this.shouldGenerateTest(filePath)) {
        const test = await this.testGenerator.generateTests({
          code: content,
          filePath,
          language: request.language,
          framework: 'jest',
          coverage: 'comprehensive',
        });

        files.set(test.testPath, test.testCode);
      }
    }
  }

  private shouldGenerateTest(filePath: string): boolean {
    return (
      filePath.includes('/src/') &&
      (filePath.endsWith('.ts') || filePath.endsWith('.js')) &&
      !filePath.includes('.spec.') &&
      !filePath.includes('.test.') &&
      !filePath.includes('index.') &&
      !filePath.includes('config.')
    );
  }

  private async generateDocumentation(
    request: ProjectGenerationRequest,
    structure: ProjectStructure,
  ): Promise<string> {
    const prompt = `Generate comprehensive documentation for:
Project: ${request.name}
Type: ${request.type}
Description: ${request.description}

Structure:
${this.structureToString(structure)}

Include:
1. Architecture overview
2. API documentation (if applicable)
3. Configuration guide
4. Deployment instructions
5. Contributing guidelines`;

    const response = await this.llmService.generateCompletion({
      messages: [
        {
          role: 'system',
          content: 'You are a technical documentation expert.',
        },
        { role: 'user', content: prompt },
      ],
    });

    return response.content;
  }

  private structureToString(
    structure: ProjectStructure,
    indent: number = 0,
  ): string {
    const indentStr = '  '.repeat(indent);
    let result = `${indentStr}${structure.name}${structure.type === 'directory' ? '/' : ''}\n`;

    if (structure.children) {
      for (const child of structure.children) {
        result += this.structureToString(child, indent + 1);
      }
    }

    return result;
  }

  private generateSetupInstructions(
    request: ProjectGenerationRequest,
    projectPlan: any,
  ): string {
    const steps = [
      '1. Clone the repository',
      '2. Install dependencies: `npm install`',
      '3. Set up environment variables (copy .env.example to .env)',
      '4. Run database migrations (if applicable)',
      '5. Start development server: `npm run dev`',
    ];

    if (request.includeDocker) {
      steps.push('6. Or use Docker: `docker-compose up`');
    }

    return steps.join('\n');
  }

  private calculateComplexity(files: Map<string, string>): number {
    let complexity = 0;

    for (const [path, content] of files) {
      if (path.endsWith('.ts') || path.endsWith('.js')) {
        // Simple complexity calculation
        complexity += content.split('\n').length / 100;
        complexity += (content.match(/class/g) || []).length * 2;
        complexity += (content.match(/interface/g) || []).length;
        complexity += (content.match(/async/g) || []).length * 0.5;
      }
    }

    return Math.min(Math.round(complexity), 100);
  }

  private async storeProjectGeneration(
    request: ProjectGenerationRequest,
    files: Map<string, string>,
  ): Promise<void> {
    // Store project structure in memory
    const projectData = {
      name: request.name,
      type: request.type,
      features: request.features,
      fileCount: files.size,
      structure: Array.from(files.keys()),
    };

    await this.memoryService.semantic.storeEmbedding(
      JSON.stringify(projectData),
      {
        type: 'code',
        source: 'project_generator',
        tags: ['project', request.type, ...request.features],
        timestamp: new Date(),
      },
    );

    // Store successful patterns
    if (files.size > 10) {
      await this.memoryService.longTerm.storePattern({
        id: `project-${Date.now()}`,
        type: 'code_generation',
        pattern: JSON.stringify(projectData),
        description: `${request.type} project with ${request.features.join(', ')}`,
        examples: [request.name],
        successRate: 100,
        usageCount: 1,
        createdAt: new Date(),
        lastUsed: new Date(),
      });
    }
  }
}
