import { Injectable, Logger } from '@nestjs/common';
import * as Docker from 'dockerode';
import { Readable } from 'stream';

export interface SandboxConfig {
  image: string;
  workspace: string;
  memoryLimit: string;
  cpuLimit: string;
  environment: Record<string, string>;
}

export interface ExecutionOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private readonly docker: Docker;
  private readonly networkName = 'mhmanus-sandbox-network';

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.initializeNetwork();
  }

  private async initializeNetwork() {
    try {
      // Check if network exists
      const networks = await this.docker.listNetworks();
      const exists = networks.some(n => n.Name === this.networkName);

      if (!exists) {
        // Create isolated network with no external access
        await this.docker.createNetwork({
          Name: this.networkName,
          Driver: 'bridge',
          Internal: true, // No external network access
          Options: {
            'com.docker.network.bridge.enable_icc': 'false', // Disable inter-container communication
          },
        });
        this.logger.log(`Created sandbox network: ${this.networkName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize network: ${error.message}`);
    }
  }

  async createSandbox(config: SandboxConfig): Promise<string> {
    try {
      // Convert memory limit to bytes
      const memoryBytes = this.parseMemoryLimit(config.memoryLimit);
      
      // Convert CPU limit to nano CPUs (1 CPU = 1e9 nano CPUs)
      const nanoCpus = Math.floor(parseFloat(config.cpuLimit) * 1e9);

      // Prepare environment variables
      const env = Object.entries(config.environment).map(
        ([key, value]) => `${key}=${value}`,
      );

      // Create container
      const container = await this.docker.createContainer({
        Image: config.image,
        Cmd: ['sleep', '3600'], // Keep container alive for 1 hour
        Tty: false,
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        WorkingDir: '/workspace',
        Env: env,
        HostConfig: {
          AutoRemove: false, // We'll remove manually
          Memory: memoryBytes,
          MemorySwap: memoryBytes, // No swap
          NanoCpus: nanoCpus,
          PidsLimit: 100, // Limit number of processes
          ReadonlyRootfs: false, // Allow writing to container filesystem
          Binds: [
            `${config.workspace}:/workspace:rw`, // Mount workspace
          ],
          Tmpfs: {
            '/tmp': 'rw,noexec,nosuid,size=100m', // Temporary writable space
          },
          NetworkMode: this.networkName,
          SecurityOpt: [
            'no-new-privileges', // Prevent privilege escalation
          ],
          CapDrop: ['ALL'], // Drop all capabilities
          CapAdd: [], // Don't add any capabilities
        },
      });

      await container.start();
      this.logger.log(`Created sandbox container: ${container.id}`);
      return container.id;
    } catch (error) {
      this.logger.error(`Failed to create sandbox: ${error.message}`);
      throw error;
    }
  }

  async executeInSandbox(
    containerId: string,
    command: string,
    timeout: number,
  ): Promise<ExecutionOutput> {
    this.logger.log(`Executing command in container ${containerId}: ${command}`);
    
    try {
      const container = this.docker.getContainer(containerId);
      
      // Create exec instance
      const exec = await container.exec({
        Cmd: ['/bin/sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: '/workspace',
        User: '1000', // Use UID instead of username
      });

      // Start execution
      const stream = await exec.start({ 
        hijack: true, 
        stdin: false,
        Tty: false,
      });
      
      // Collect output with proper stream handling
      const output = await this.collectOutputSimple(stream, exec, timeout);
      
      return output;
    } catch (error) {
      this.logger.error(`Execution failed: ${error.message}`);
      throw error;
    }
  }

  async destroySandbox(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      
      // Stop container (with 5 second grace period)
      await container.stop({ t: 5 }).catch(() => {
        // Container might already be stopped
      });
      
      // Remove container
      await container.remove({ force: true });
      
      this.logger.log(`Destroyed sandbox container: ${containerId}`);
    } catch (error) {
      this.logger.error(`Failed to destroy sandbox: ${error.message}`);
      throw error;
    }
  }

  private async collectOutputSimple(
    stream: any,
    exec: any,
    timeout: number,
  ): Promise<ExecutionOutput> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let chunks: Buffer[] = [];
      let settled = false;

      this.logger.debug(`Starting output collection with timeout: ${timeout}ms`);

      // Set timeout
      const timer = setTimeout(async () => {
        if (!settled) {
          settled = true;
          this.logger.warn(`Output collection timed out after ${timeout}ms`);
          try {
            stream.destroy();
          } catch (e) {}
          
          // Try to get the exit code
          try {
            const inspectResult = await exec.inspect();
            resolve({
              stdout: stdout || 'Command timed out',
              stderr: stderr || `Execution timed out after ${timeout}ms`,
              exitCode: inspectResult.ExitCode || -1,
            });
          } catch (e) {
            resolve({
              stdout: stdout,
              stderr: `Execution timed out after ${timeout}ms`,
              exitCode: -1,
            });
          }
        }
      }, timeout);

      // Collect raw data first
      stream.on('data', (chunk: Buffer) => {
        this.logger.debug(`Received chunk of size: ${chunk.length}`);
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          this.logger.debug(`Stream ended, processing ${chunks.length} chunks`);
          
          try {
            // Process the collected chunks
            const buffer = Buffer.concat(chunks);
            this.logger.debug(`Total buffer size: ${buffer.length}`);
            
            // Docker stream format: [8 byte header][payload]
            // Header: [stream type][0][0][0][size (4 bytes BE)]
            let offset = 0;
            
            while (offset < buffer.length) {
              if (buffer.length - offset < 8) {
                this.logger.debug(`Not enough data for header at offset ${offset}`);
                break;
              }
              
              const streamType = buffer[offset];
              const payloadSize = buffer.readUInt32BE(offset + 4);
              this.logger.debug(`Stream type: ${streamType}, payload size: ${payloadSize}`);
              
              if (buffer.length - offset < 8 + payloadSize) {
                this.logger.debug(`Not enough data for payload at offset ${offset}`);
                break;
              }
              
              const payload = buffer.slice(offset + 8, offset + 8 + payloadSize);
              const text = payload.toString('utf8');
              
              if (streamType === 1) {
                stdout += text;
                this.logger.debug(`Added to stdout: ${text.substring(0, 50)}...`);
              } else if (streamType === 2) {
                stderr += text;
                this.logger.debug(`Added to stderr: ${text.substring(0, 50)}...`);
              }
              
              offset += 8 + payloadSize;
            }
            
            // Get exit code
            const inspectResult = await exec.inspect();
            this.logger.debug(`Exit code: ${inspectResult.ExitCode}`);
            
            const result = {
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: inspectResult.ExitCode || 0,
            };
            
            this.logger.debug(`Final result: stdout length=${result.stdout.length}, stderr length=${result.stderr.length}, exitCode=${result.exitCode}`);
            resolve(result);
          } catch (error) {
            this.logger.error(`Error processing output: ${error.message}`);
            resolve({
              stdout: stdout,
              stderr: stderr || error.message,
              exitCode: -1,
            });
          }
        }
      });

      stream.on('error', (error: Error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          this.logger.error(`Stream error: ${error.message}`);
          reject(error);
        }
      });
    });
  }

  private parseMemoryLimit(limit: string): number {
    const units = {
      b: 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    };
    
    const match = limit.toLowerCase().match(/^(\d+)([bkmg])?$/);
    if (!match) {
      throw new Error(`Invalid memory limit: ${limit}`);
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2] || 'b';
    
    return value * units[unit];
  }

  async pullImage(imageName: string): Promise<void> {
    try {
      this.logger.log(`Pulling image: ${imageName}`);
      
      const stream = await this.docker.pull(imageName);
      
      // Wait for pull to complete
      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err: any, res: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      });
      
      this.logger.log(`Successfully pulled image: ${imageName}`);
    } catch (error) {
      this.logger.error(`Failed to pull image: ${error.message}`);
      throw error;
    }
  }

  async listSandboxes(): Promise<any[]> {
    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        network: [this.networkName],
      },
    });
    
    return containers.map(c => ({
      id: c.Id,
      image: c.Image,
      state: c.State,
      created: new Date(c.Created * 1000),
    }));
  }
}