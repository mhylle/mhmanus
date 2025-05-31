import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database health
      () => this.db.pingCheck('database'),
      
      // Memory health - 300MB heap threshold
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      
      // Memory RSS - 300MB threshold
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      
      // Disk health - 90% threshold
      () => this.disk.checkStorage('storage', { 
        path: '/', 
        thresholdPercent: 0.9 
      }),
      
      // Redis health check
      () => this.healthService.checkRedis('redis'),
      
      // Bull queue health check
      () => this.healthService.checkBullQueue('bull_queue'),
      
      // Ollama service health check
      () => this.healthService.checkOllama('ollama'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      // Basic database connectivity
      () => this.db.pingCheck('database'),
      
      // Redis connectivity
      () => this.healthService.checkRedis('redis'),
      
      // Essential services
      () => this.healthService.checkEssentialServices('services'),
    ]);
  }

  @Get('live')
  liveness() {
    // Simple liveness probe - just return ok if the process is running
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}