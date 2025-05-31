import { Injectable, Logger } from '@nestjs/common';
import * as Docker from 'dockerode';
import { ResourceMetrics } from './execution.service';

interface ContainerStats {
  cpu_stats: {
    cpu_usage: {
      total_usage: number;
      usage_in_kernelmode: number;
      usage_in_usermode: number;
    };
    system_cpu_usage: number;
    online_cpus: number;
  };
  precpu_stats: {
    cpu_usage: {
      total_usage: number;
    };
    system_cpu_usage: number;
  };
  memory_stats: {
    usage: number;
    max_usage: number;
    limit: number;
    stats: {
      cache: number;
    };
  };
  blkio_stats: {
    io_service_bytes_recursive: Array<{
      major: number;
      minor: number;
      op: string;
      value: number;
    }>;
  };
}

@Injectable()
export class ResourceMonitor {
  private readonly logger = new Logger(ResourceMonitor.name);
  private readonly docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async monitorContainer(
    containerId: string,
    pollInterval: number = 100,
  ): Promise<ResourceMetrics> {
    const container = this.docker.getContainer(containerId);
    const metrics: ResourceMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      peakMemory: 0,
      diskRead: 0,
      diskWrite: 0,
    };

    let maxCpuUsage = 0;
    let monitoring = true;

    // Start monitoring in background
    const monitoringPromise = this.startMonitoring(
      container,
      pollInterval,
      (stats) => {
        if (!monitoring) return;

        // Calculate CPU usage percentage
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                        stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - 
                           stats.precpu_stats.system_cpu_usage;
        const cpuCount = stats.cpu_stats.online_cpus || 1;

        if (systemDelta > 0 && cpuDelta > 0) {
          const cpuPercent = (cpuDelta / systemDelta) * cpuCount * 100;
          maxCpuUsage = Math.max(maxCpuUsage, cpuPercent);
        }

        // Memory usage
        const memoryUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
        metrics.memoryUsage = Math.max(metrics.memoryUsage, memoryUsage);
        metrics.peakMemory = Math.max(metrics.peakMemory, stats.memory_stats.max_usage || memoryUsage);

        // Disk I/O
        if (stats.blkio_stats.io_service_bytes_recursive) {
          let diskRead = 0;
          let diskWrite = 0;

          for (const io of stats.blkio_stats.io_service_bytes_recursive) {
            if (io.op === 'Read') {
              diskRead += io.value;
            } else if (io.op === 'Write') {
              diskWrite += io.value;
            }
          }

          metrics.diskRead = diskRead;
          metrics.diskWrite = diskWrite;
        }
      },
    );

    // Return a wrapper that stops monitoring when called
    return new Promise((resolve) => {
      // Container exit listener
      container.wait((err, data) => {
        monitoring = false;
        metrics.cpuUsage = maxCpuUsage;
        resolve(metrics);
      });

      // Also resolve when explicitly stopped
      (metrics as any).stop = () => {
        monitoring = false;
        metrics.cpuUsage = maxCpuUsage;
        resolve(metrics);
      };
    });
  }

  private async startMonitoring(
    container: Docker.Container,
    pollInterval: number,
    callback: (stats: ContainerStats) => void,
  ): Promise<void> {
    try {
      const stream = await container.stats({ stream: true });

      stream.on('data', (chunk: Buffer) => {
        try {
          const stats = JSON.parse(chunk.toString()) as ContainerStats;
          callback(stats);
        } catch (error) {
          this.logger.warn(`Failed to parse stats: ${error.message}`);
        }
      });

      stream.on('error', (error: Error) => {
        this.logger.error(`Stats stream error: ${error.message}`);
      });

      stream.on('end', () => {
        this.logger.debug('Stats stream ended');
      });
    } catch (error) {
      this.logger.error(`Failed to start monitoring: ${error.message}`);
    }
  }

  async getContainerLimits(containerId: string): Promise<{
    memoryLimit: number;
    cpuQuota: number;
    cpuPeriod: number;
  }> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();

      return {
        memoryLimit: info.HostConfig.Memory || 0,
        cpuQuota: info.HostConfig.CpuQuota || 0,
        cpuPeriod: info.HostConfig.CpuPeriod || 100000,
      };
    } catch (error) {
      this.logger.error(`Failed to get container limits: ${error.message}`);
      throw error;
    }
  }

  formatMetrics(metrics: ResourceMetrics): string {
    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    return `
Resource Usage Summary:
- CPU Usage: ${metrics.cpuUsage.toFixed(2)}%
- Memory Usage: ${formatBytes(metrics.memoryUsage)}
- Peak Memory: ${formatBytes(metrics.peakMemory)}
- Disk Read: ${formatBytes(metrics.diskRead)}
- Disk Write: ${formatBytes(metrics.diskWrite)}
    `.trim();
  }
}