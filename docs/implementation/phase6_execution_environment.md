# Phase 6: Execution Environment Implementation

**Start Date**: May 30, 2025  
**Goal**: Enable safe code execution with the ability to create, run, and test generated code

## Overview

Phase 6 transforms our AI agent system from a code generator to a code executor. Agents will be able to:
- Create actual files on disk
- Execute code in sandboxed environments
- Run tests and validate output
- Monitor resource usage
- Rollback on failures

## Architecture Design

### 1. Execution Service Architecture

```typescript
// New module: backend/src/execution/execution.module.ts
@Module({
  imports: [
    DockerModule,
    FileSystemModule,
    MonitoringModule,
  ],
  providers: [
    ExecutionService,
    SandboxService,
    FileSystemService,
    ResourceMonitor,
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}
```

### 2. Core Components

#### A. Execution Service
```typescript
interface ExecutionRequest {
  taskId: string;
  language: 'typescript' | 'python' | 'javascript';
  files: FileDefinition[];
  command: string;
  timeout?: number;
  memoryLimit?: string;
  cpuLimit?: string;
}

interface FileDefinition {
  path: string;
  content: string;
  executable?: boolean;
}

interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  resourceUsage: ResourceMetrics;
  files: GeneratedFile[];
}
```

#### B. Sandbox Service (Docker-based)
```typescript
class SandboxService {
  async createSandbox(config: SandboxConfig): Promise<Sandbox> {
    // Create isolated Docker container
    // Mount temporary workspace
    // Apply resource limits
    // Set up networking restrictions
  }

  async executeInSandbox(
    sandbox: Sandbox,
    command: string,
    timeout: number
  ): Promise<ExecutionResult> {
    // Execute command in container
    // Stream output
    // Monitor resources
    // Clean up on completion
  }
}
```

#### C. File System Service
```typescript
class FileSystemService {
  private workspaceRoot = '/tmp/mhmanus-workspaces';

  async createWorkspace(taskId: string): Promise<string> {
    // Create isolated directory for task
    // Set permissions
    // Return workspace path
  }

  async writeFiles(
    workspace: string,
    files: FileDefinition[]
  ): Promise<void> {
    // Create directory structure
    // Write files to disk
    // Set executable permissions if needed
  }

  async collectOutput(workspace: string): Promise<GeneratedFile[]> {
    // Scan workspace for created/modified files
    // Read file contents
    // Return file list
  }

  async cleanupWorkspace(workspace: string): Promise<void> {
    // Remove temporary files
    // Clean up directories
  }
}
```

### 3. Docker Configuration

#### Docker-in-Docker Setup
```yaml
# docker-compose.yml addition
execution-sandbox:
  image: docker:dind
  privileged: true
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - ./workspaces:/workspaces
  environment:
    - DOCKER_TLS_CERTDIR=/certs
  networks:
    - mhmanus-network
```

#### Sandbox Images
```dockerfile
# sandboxes/node/Dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /workspace
# Security restrictions
RUN adduser -D -s /bin/sh sandboxuser
USER sandboxuser
```

```dockerfile
# sandboxes/python/Dockerfile
FROM python:3.11-slim
RUN pip install pytest numpy pandas
WORKDIR /workspace
# Security restrictions
RUN useradd -m -s /bin/bash sandboxuser
USER sandboxuser
```

### 4. Integration with Agents

#### Enhanced Code Agent
```typescript
class CodeAgent extends BaseAgent {
  constructor(
    private executionService: ExecutionService,
    // ... other dependencies
  ) {}

  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    // Generate code as before
    const generatedCode = await this.generateCode(task);
    
    // NEW: Execute generated code
    if (task.metadata?.executeCode !== false) {
      const executionResult = await this.executionService.execute({
        taskId: task.id,
        language: this.detectLanguage(generatedCode),
        files: this.prepareFiles(generatedCode),
        command: this.buildCommand(generatedCode),
        timeout: 30000, // 30 seconds
        memoryLimit: '512m',
        cpuLimit: '0.5',
      });

      // Validate execution results
      if (!executionResult.success) {
        // Attempt to fix and retry
        const fixedCode = await this.debugAndFix(
          generatedCode,
          executionResult
        );
        // Retry execution...
      }

      return {
        ...result,
        executionResult,
        generatedFiles: executionResult.files,
      };
    }
  }
}
```

### 5. Resource Monitoring

```typescript
interface ResourceMetrics {
  cpuUsage: number;      // Percentage
  memoryUsage: number;   // Bytes
  diskIO: DiskMetrics;
  networkIO: NetworkMetrics;
  duration: number;      // Milliseconds
}

class ResourceMonitor {
  async monitorExecution(
    containerId: string,
    interval: number = 100
  ): Promise<ResourceMetrics> {
    // Poll Docker stats API
    // Aggregate metrics
    // Detect limit violations
    // Return summary
  }
}
```

### 6. Safety Features

1. **Network Isolation**: Sandboxes have no internet access by default
2. **File System Limits**: Read-only system directories, size quotas
3. **Time Limits**: Automatic termination after timeout
4. **Resource Limits**: CPU and memory caps
5. **Process Limits**: Maximum number of processes
6. **Output Limits**: Maximum stdout/stderr size

### 7. API Endpoints

```typescript
@Controller('execution')
export class ExecutionController {
  @Post('execute')
  @UseGuards(AuthGuard)
  async executeCode(@Body() dto: ExecuteCodeDto) {
    return this.executionService.execute(dto);
  }

  @Get('workspaces/:taskId')
  async getWorkspaceFiles(@Param('taskId') taskId: string) {
    return this.fileSystemService.getWorkspaceContents(taskId);
  }

  @Delete('workspaces/:taskId')
  async cleanupWorkspace(@Param('taskId') taskId: string) {
    return this.fileSystemService.cleanupWorkspace(taskId);
  }
}
```

## Implementation Steps

### Step 1: Basic Execution Service
1. Create execution module structure
2. Implement FileSystemService for workspace management
3. Add basic command execution (without Docker initially)
4. Test with simple scripts

### Step 2: Docker Integration
1. Set up Docker-in-Docker configuration
2. Create sandbox container images
3. Implement SandboxService
4. Add resource limiting

### Step 3: Agent Integration
1. Update Code Agent to use ExecutionService
2. Add execution options to task metadata
3. Implement result validation
4. Add retry logic for failures

### Step 4: Monitoring & Safety
1. Implement ResourceMonitor
2. Add execution metrics to database
3. Create safety validation checks
4. Add cleanup procedures

### Step 5: Testing & Validation
1. Create test suite for execution scenarios
2. Test resource limits
3. Verify security restrictions
4. Performance benchmarking

## Success Criteria

1. **Functional Requirements**
   - ✓ Code can be written to disk
   - ✓ Scripts can be executed safely
   - ✓ Output is captured and returned
   - ✓ Resources are monitored

2. **Safety Requirements**
   - ✓ No sandbox escapes
   - ✓ Resource limits enforced
   - ✓ Network isolation working
   - ✓ Automatic cleanup

3. **Performance Requirements**
   - ✓ Execution overhead < 1 second
   - ✓ Support 10 concurrent executions
   - ✓ Workspace cleanup < 100ms

## Next Steps

After Phase 6 is complete, the system will be able to:
- Generate code and immediately test it
- Create complete projects with multiple files
- Run test suites on generated code
- Self-correct based on execution results

This sets the foundation for Phase 7 (Tool Integration) where agents can use external tools and APIs.