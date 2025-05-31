import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface FileDefinition {
  path: string;
  content: string;
  executable?: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
  size: number;
  hash: string;
  created: boolean; // true if created, false if modified
}

@Injectable()
export class FileSystemService {
  private readonly logger = new Logger(FileSystemService.name);
  private readonly workspaceRoot = process.env.WORKSPACE_ROOT || '/tmp/mhmanus-workspaces';
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly maxWorkspaceSize = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.initializeWorkspaceRoot();
  }

  private async initializeWorkspaceRoot() {
    try {
      await fs.mkdir(this.workspaceRoot, { recursive: true });
      await fs.chmod(this.workspaceRoot, 0o755); // Allow read/execute for all
      this.logger.log(`Workspace root initialized at: ${this.workspaceRoot}`);
    } catch (error) {
      this.logger.error(`Failed to initialize workspace root: ${error.message}`);
    }
  }

  async createWorkspace(taskId: string): Promise<string> {
    const workspaceId = `${taskId}-${uuidv4().substring(0, 8)}`;
    const workspacePath = path.join(this.workspaceRoot, workspaceId);

    try {
      await fs.mkdir(workspacePath, { recursive: true });
      // Set permissions to allow container user (UID 1000) to access
      await fs.chmod(workspacePath, 0o755); // Read/execute for all, write for owner
      this.logger.log(`Created workspace: ${workspacePath}`);
      return workspacePath;
    } catch (error) {
      this.logger.error(`Failed to create workspace: ${error.message}`);
      throw new Error(`Workspace creation failed: ${error.message}`);
    }
  }

  async writeFiles(workspace: string, files: FileDefinition[]): Promise<void> {
    for (const file of files) {
      const filePath = path.join(workspace, file.path);
      const fileDir = path.dirname(filePath);

      // Security check: ensure file path doesn't escape workspace
      if (!filePath.startsWith(workspace)) {
        throw new Error(`Invalid file path: ${file.path}`);
      }

      // Check file size
      if (Buffer.byteLength(file.content, 'utf8') > this.maxFileSize) {
        throw new Error(`File ${file.path} exceeds maximum size limit`);
      }

      try {
        // Create directory structure
        await fs.mkdir(fileDir, { recursive: true });
        await fs.chmod(fileDir, 0o755); // Ensure directories are accessible

        // Write file
        await fs.writeFile(filePath, file.content, 'utf8');

        // Set file permissions
        if (file.executable) {
          await fs.chmod(filePath, 0o755);
        } else {
          await fs.chmod(filePath, 0o644); // Read for all, write for owner
        }

        this.logger.debug(`Wrote file: ${filePath}`);
      } catch (error) {
        this.logger.error(`Failed to write file ${file.path}: ${error.message}`);
        throw error;
      }
    }

    // Verify workspace size
    const totalSize = await this.calculateWorkspaceSize(workspace);
    if (totalSize > this.maxWorkspaceSize) {
      throw new Error('Workspace size exceeds maximum limit');
    }
  }

  async collectOutput(workspace: string, originalFiles: string[] = []): Promise<GeneratedFile[]> {
    const generatedFiles: GeneratedFile[] = [];
    const originalSet = new Set(originalFiles.map(f => path.join(workspace, f)));

    const scanDirectory = async (dir: string, baseDir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          // Skip common directories
          if (['.git', 'node_modules', '__pycache__'].includes(entry.name)) {
            continue;
          }
          await scanDirectory(fullPath, baseDir);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            if (stats.size > this.maxFileSize) {
              this.logger.warn(`Skipping large file: ${relativePath}`);
              continue;
            }

            const content = await fs.readFile(fullPath, 'utf8');
            const hash = crypto.createHash('md5').update(content).digest('hex');

            generatedFiles.push({
              path: relativePath,
              content,
              size: stats.size,
              hash,
              created: !originalSet.has(fullPath),
            });
          } catch (error) {
            this.logger.warn(`Failed to read file ${relativePath}: ${error.message}`);
          }
        }
      }
    };

    await scanDirectory(workspace, workspace);
    return generatedFiles;
  }

  async cleanupWorkspace(workspace: string): Promise<void> {
    // Security check
    if (!workspace.startsWith(this.workspaceRoot)) {
      throw new Error('Invalid workspace path');
    }

    try {
      await fs.rm(workspace, { recursive: true, force: true });
      this.logger.log(`Cleaned up workspace: ${workspace}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup workspace: ${error.message}`);
      throw error;
    }
  }

  async getWorkspaceContents(workspace: string): Promise<any> {
    const contents: any = {};

    const scanDirectory = async (dir: string, obj: any, basePath: string = ''): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
          obj[entry.name] = {};
          await scanDirectory(fullPath, obj[entry.name], relativePath);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            obj[entry.name] = {
              size: stats.size,
              modified: stats.mtime,
              path: relativePath,
            };
          } catch (error) {
            this.logger.warn(`Failed to stat file ${relativePath}: ${error.message}`);
          }
        }
      }
    };

    await scanDirectory(workspace, contents);
    return contents;
  }

  private async calculateWorkspaceSize(workspace: string): Promise<number> {
    let totalSize = 0;

    const calculateDirSize = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await calculateDirSize(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    };

    await calculateDirSize(workspace);
    return totalSize;
  }

  async validateWorkspacePath(workspace: string): Promise<boolean> {
    return workspace.startsWith(this.workspaceRoot) && !workspace.includes('..');
  }
}