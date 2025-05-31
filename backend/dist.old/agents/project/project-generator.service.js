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
var ProjectGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../../llm/llm.service");
const memory_service_1 = require("../../memory/memory.service");
const template_service_1 = require("../templates/template.service");
const test_generator_service_1 = require("../testing/test-generator.service");
let ProjectGeneratorService = ProjectGeneratorService_1 = class ProjectGeneratorService {
    llmService;
    memoryService;
    templateService;
    testGenerator;
    logger = new common_1.Logger(ProjectGeneratorService_1.name);
    constructor(llmService, memoryService, templateService, testGenerator) {
        this.llmService = llmService;
        this.memoryService = memoryService;
        this.templateService = templateService;
        this.testGenerator = testGenerator;
    }
    async generateProject(request) {
        this.logger.log(`Generating ${request.type} project: ${request.name}`);
        const similarProjects = await this.getSimilarProjects(request);
        const projectPlan = await this.createProjectPlan(request, similarProjects);
        const structure = await this.generateProjectStructure(projectPlan);
        const files = await this.generateProjectFiles(structure, projectPlan, request);
        if (request.includeTests) {
            await this.generateProjectTests(files, request);
        }
        const documentation = await this.generateDocumentation(request, structure);
        await this.storeProjectGeneration(request, files);
        return {
            structure,
            files,
            documentation,
            setupInstructions: this.generateSetupInstructions(request, projectPlan),
            estimatedComplexity: this.calculateComplexity(files),
        };
    }
    async getSimilarProjects(request) {
        const similar = await this.memoryService.semantic.searchSimilar(`${request.type} project ${request.framework || ''} ${request.features.join(' ')}`, 5);
        const patterns = await this.memoryService.longTerm.getPatterns('project_structure');
        return {
            projects: similar.filter((s) => s.metadata.tags?.includes('project')),
            patterns,
            commonStructures: this.extractCommonStructures(similar),
        };
    }
    extractCommonStructures(similar) {
        const structures = {
            directories: new Set(),
            files: new Set(),
            patterns: [],
        };
        for (const item of similar) {
            if (item.metadata.tags?.includes('project') && item.content) {
                const dirs = item.content.match(/\/\w+\//g) || [];
                dirs.forEach((d) => structures.directories.add(d));
            }
        }
        return structures;
    }
    async createProjectPlan(request, similarProjects) {
        const prompt = `Create a detailed project plan for:

Project: ${request.name}
Type: ${request.type}
Description: ${request.description}
Framework: ${request.framework || 'None specified'}
Features: ${request.features.join(', ')}
Language: ${request.language}

${similarProjects.patterns.length > 0
            ? `
Successful project patterns:
${similarProjects.patterns.map((p) => `- ${p.description}`).join('\n')}
`
            : ''}

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
                    content: 'You are a software architect expert in project structure and organization.',
                },
                { role: 'user', content: prompt },
            ],
        });
        try {
            return JSON.parse(response.content);
        }
        catch {
            return this.createDefaultProjectPlan(request);
        }
    }
    createDefaultProjectPlan(request) {
        const basePlan = {
            directories: ['src', 'tests', 'docs'],
            coreFiles: [],
            dependencies: {},
            devDependencies: {},
            scripts: {},
        };
        switch (request.type) {
            case 'api':
                basePlan.directories.push('src/routes', 'src/controllers', 'src/services', 'src/models');
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
    async generateProjectStructure(projectPlan) {
        const root = {
            name: projectPlan.name || 'project',
            type: 'directory',
            path: '.',
            children: [],
        };
        for (const dir of projectPlan.directories || []) {
            this.addDirectoryToStructure(root, dir);
        }
        for (const file of projectPlan.coreFiles || []) {
            this.addFileToStructure(root, file);
        }
        this.addStandardFiles(root, projectPlan);
        return root;
    }
    addDirectoryToStructure(root, path) {
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
    addFileToStructure(root, path) {
        const parts = path.split('/').filter((p) => p);
        const fileName = parts.pop();
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
        const file = {
            name: fileName,
            type: 'file',
            path: current.path === '.' ? fileName : `${current.path}/${fileName}`,
        };
        current.children = current.children || [];
        current.children.push(file);
    }
    addStandardFiles(root, projectPlan) {
        this.addFileToStructure(root, 'package.json');
        this.addFileToStructure(root, 'tsconfig.json');
        this.addFileToStructure(root, 'README.md');
        this.addFileToStructure(root, '.gitignore');
        if (projectPlan.includeDocker) {
            this.addFileToStructure(root, 'Dockerfile');
            this.addFileToStructure(root, 'docker-compose.yml');
        }
        this.addDirectoryToStructure(root, '.github/workflows');
        this.addFileToStructure(root, '.github/workflows/ci.yml');
    }
    async generateProjectFiles(structure, projectPlan, request) {
        const files = new Map();
        await this.generateFilesRecursive(structure, files, projectPlan, request);
        return files;
    }
    async generateFilesRecursive(node, files, projectPlan, request) {
        if (node.type === 'file') {
            const content = await this.generateFileContent(node.path, projectPlan, request);
            files.set(node.path, content);
        }
        else if (node.children) {
            for (const child of node.children) {
                await this.generateFilesRecursive(child, files, projectPlan, request);
            }
        }
    }
    async generateFileContent(filePath, projectPlan, request) {
        const fileName = filePath.split('/').pop();
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
        if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
            return this.generateCodeFile(filePath, projectPlan, request);
        }
        return '// Generated file';
    }
    generatePackageJson(request, projectPlan) {
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
    generateTsConfig(request) {
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
    generateReadme(request) {
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
    generateGitignore(request) {
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
    generateDockerfile(request) {
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
    generateDockerCompose(request) {
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
    generateCIConfig(request) {
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
    async generateCodeFile(filePath, projectPlan, request) {
        const fileType = this.determineFileType(filePath);
        const purpose = this.determineFilePurpose(filePath, fileType);
        const templates = await this.templateService.getTemplatesByCategory(fileType);
        if (templates.length > 0) {
            const template = templates[0];
            const variables = this.prepareTemplateVariables(filePath, request, projectPlan);
            return this.templateService.renderTemplate(template.id, variables);
        }
        return this.generateCodeWithLLM(filePath, purpose, request, projectPlan);
    }
    determineFileType(filePath) {
        if (filePath.includes('controller'))
            return 'controller';
        if (filePath.includes('service'))
            return 'service';
        if (filePath.includes('model') || filePath.includes('entity'))
            return 'entity';
        if (filePath.includes('interface') || filePath.includes('types'))
            return 'interface';
        if (filePath.includes('config'))
            return 'config';
        if (filePath.includes('test') || filePath.includes('spec'))
            return 'test';
        return 'generic';
    }
    determineFilePurpose(filePath, fileType) {
        const fileName = filePath
            .split('/')
            .pop()
            .replace(/\.[^.]+$/, '');
        const parts = filePath.split('/').filter((p) => p && p !== 'src');
        return `${fileType} for ${fileName} in ${parts.join('/')}`;
    }
    prepareTemplateVariables(filePath, request, projectPlan) {
        const fileName = filePath
            .split('/')
            .pop()
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
    generateDefaultMethods(filePath) {
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
    generateDefaultProperties(filePath) {
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
    async generateCodeWithLLM(filePath, purpose, request, projectPlan) {
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
    extractCode(response) {
        const codeMatch = response.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
        if (codeMatch) {
            return codeMatch[1].trim();
        }
        return response.trim();
    }
    async generateProjectTests(files, request) {
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
    shouldGenerateTest(filePath) {
        return (filePath.includes('/src/') &&
            (filePath.endsWith('.ts') || filePath.endsWith('.js')) &&
            !filePath.includes('.spec.') &&
            !filePath.includes('.test.') &&
            !filePath.includes('index.') &&
            !filePath.includes('config.'));
    }
    async generateDocumentation(request, structure) {
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
    structureToString(structure, indent = 0) {
        const indentStr = '  '.repeat(indent);
        let result = `${indentStr}${structure.name}${structure.type === 'directory' ? '/' : ''}\n`;
        if (structure.children) {
            for (const child of structure.children) {
                result += this.structureToString(child, indent + 1);
            }
        }
        return result;
    }
    generateSetupInstructions(request, projectPlan) {
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
    calculateComplexity(files) {
        let complexity = 0;
        for (const [path, content] of files) {
            if (path.endsWith('.ts') || path.endsWith('.js')) {
                complexity += content.split('\n').length / 100;
                complexity += (content.match(/class/g) || []).length * 2;
                complexity += (content.match(/interface/g) || []).length;
                complexity += (content.match(/async/g) || []).length * 0.5;
            }
        }
        return Math.min(Math.round(complexity), 100);
    }
    async storeProjectGeneration(request, files) {
        const projectData = {
            name: request.name,
            type: request.type,
            features: request.features,
            fileCount: files.size,
            structure: Array.from(files.keys()),
        };
        await this.memoryService.semantic.storeEmbedding(JSON.stringify(projectData), {
            type: 'code',
            source: 'project_generator',
            tags: ['project', request.type, ...request.features],
            timestamp: new Date(),
        });
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
};
exports.ProjectGeneratorService = ProjectGeneratorService;
exports.ProjectGeneratorService = ProjectGeneratorService = ProjectGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LLMService,
        memory_service_1.MemoryService,
        template_service_1.TemplateService,
        test_generator_service_1.TestGeneratorService])
], ProjectGeneratorService);
//# sourceMappingURL=project-generator.service.js.map