import { Injectable, Logger } from '@nestjs/common';
import { FileSystemService, FileDefinition, GeneratedFile } from './filesystem.service';
import { SandboxService } from './sandbox.service';
import { ResourceMonitor } from './resource-monitor.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface ExecutionRequest {
  taskId: string;
  language: 'typescript' | 'python' | 'javascript' | 'bash';
  files: FileDefinition[];
  command: string;
  timeout?: number; // milliseconds
  memoryLimit?: string; // e.g., '512m'
  cpuLimit?: string; // e.g., '0.5' (half a CPU)
  environment?: Record<string, string>;
}

export interface ExecutionResult {
  executionId: string;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  resourceUsage: ResourceMetrics;
  files: GeneratedFile[];
  error?: string;
}

export interface ResourceMetrics {
  cpuUsage: number; // percentage
  memoryUsage: number; // bytes
  peakMemory: number; // bytes
  diskRead: number; // bytes
  diskWrite: number; // bytes
}

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly defaultMemoryLimit = '512m';
  private readonly defaultCpuLimit = '0.5';

  constructor(
    private fileSystemService: FileSystemService,
    private sandboxService: SandboxService,
    private resourceMonitor: ResourceMonitor,
  ) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();
    let workspace: string | null = null;
    let sandboxId: string | null = null;

    this.logger.log(`Starting execution ${executionId} for task ${request.taskId}`);

    try {
      // 1. Create workspace
      workspace = await this.fileSystemService.createWorkspace(request.taskId);

      // 2. Write files to workspace
      await this.fileSystemService.writeFiles(workspace, request.files);
      const originalFiles = request.files.map(f => f.path);

      // 3. Create sandbox
      const sandboxConfig = {
        image: this.getImageForLanguage(request.language),
        workspace,
        memoryLimit: request.memoryLimit || this.defaultMemoryLimit,
        cpuLimit: request.cpuLimit || this.defaultCpuLimit,
        environment: request.environment || {},
      };

      sandboxId = await this.sandboxService.createSandbox(sandboxConfig);

      // 4. Start resource monitoring
      const monitoringPromise = this.resourceMonitor.monitorContainer(
        sandboxId,
        100, // Poll every 100ms
      );

      // 5. Execute command
      const timeout = request.timeout || this.defaultTimeout;
      this.logger.log(`Executing command: ${request.command} with timeout: ${timeout}ms`);
      
      const executionResult = await this.sandboxService.executeInSandbox(
        sandboxId,
        request.command,
        timeout,
      );
      
      this.logger.log(`Execution completed with exit code: ${executionResult.exitCode}`);

      // 7. Stop monitoring and get metrics
      // For now, use a simple timeout since containers stay alive
      const resourceMetrics = await Promise.race([
        monitoringPromise,
        new Promise<ResourceMetrics>((resolve) => {
          setTimeout(() => {
            resolve({
              cpuUsage: 0,
              memoryUsage: 0,
              peakMemory: 0,
              diskRead: 0,
              diskWrite: 0,
            });
          }, 100); // Give it 100ms to collect some stats
        }),
      ]);

      // 8. Collect generated/modified files
      const generatedFiles = await this.fileSystemService.collectOutput(
        workspace,
        originalFiles,
      );

      const duration = Date.now() - startTime;

      return {
        executionId,
        success: executionResult.exitCode === 0,
        stdout: this.truncateOutput(executionResult.stdout),
        stderr: this.truncateOutput(executionResult.stderr),
        exitCode: executionResult.exitCode,
        duration,
        resourceUsage: resourceMetrics,
        files: generatedFiles,
      };
    } catch (error) {
      this.logger.error(`Execution ${executionId} failed: ${error.message}`);
      return {
        executionId,
        success: false,
        stdout: '',
        stderr: error.message,
        exitCode: -1,
        duration: Date.now() - startTime,
        resourceUsage: {
          cpuUsage: 0,
          memoryUsage: 0,
          peakMemory: 0,
          diskRead: 0,
          diskWrite: 0,
        },
        files: [],
        error: error.message,
      };
    } finally {
      // Cleanup
      if (sandboxId) {
        await this.sandboxService.destroySandbox(sandboxId).catch(err =>
          this.logger.error(`Failed to destroy sandbox: ${err.message}`),
        );
      }

      if (workspace) {
        // Keep workspace for a while for debugging, clean up later
        const workspaceToClean = workspace;
        setTimeout(() => {
          this.fileSystemService.cleanupWorkspace(workspaceToClean).catch(err =>
            this.logger.error(`Failed to cleanup workspace: ${err.message}`),
          );
        }, 300000); // Clean up after 5 minutes
      }
    }
  }

  private getImageForLanguage(language: string): string {
    const imageMap = {
      typescript: 'mhmanus/sandbox-node:latest',
      javascript: 'mhmanus/sandbox-node:latest',
      python: 'mhmanus/sandbox-node:latest', // Use node image for now
      bash: 'mhmanus/sandbox-base:latest',
    };
    return imageMap[language] || 'mhmanus/sandbox-base:latest';
  }

  private truncateOutput(output: string, maxLength: number = 100000): string {
    if (output.length <= maxLength) {
      return output;
    }
    return output.substring(0, maxLength) + '\n... [truncated]';
  }

  private createTimeoutPromise(timeout: number): Promise<any> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  async validateExecutionRequest(request: ExecutionRequest): Promise<string[]> {
    const errors: string[] = [];

    if (!request.taskId) {
      errors.push('taskId is required');
    }

    if (!request.command) {
      errors.push('command is required');
    }

    if (!request.files || request.files.length === 0) {
      errors.push('At least one file is required');
    }

    if (request.timeout && request.timeout > 300000) {
      errors.push('Timeout cannot exceed 5 minutes');
    }

    // Validate file paths
    for (const file of request.files || []) {
      if (file.path.includes('..') || path.isAbsolute(file.path)) {
        errors.push(`Invalid file path: ${file.path}`);
      }
    }

    return errors;
  }
}