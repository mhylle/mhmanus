import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';
import Redis from 'ioredis';

@Injectable()
export class HealthService extends HealthIndicator {
  private redis: Redis;

  constructor(
    @InjectQueue('tasks') private taskQueue: Queue,
  ) {
    super();
    this.redis = new Redis({
      host: 'redis',
      port: 6379,
    });
  }

  async checkRedis(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  async checkBullQueue(key: string): Promise<HealthIndicatorResult> {
    try {
      const queueHealth = await this.taskQueue.isReady();
      const jobCounts = await this.taskQueue.getJobCounts();
      
      const isHealthy = queueHealth && jobCounts.failed < 100;
      
      return this.getStatus(key, isHealthy, {
        ready: queueHealth,
        jobCounts,
      });
    } catch (error) {
      throw new HealthCheckError(
        'Bull queue check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  async checkOllama(key: string): Promise<HealthIndicatorResult> {
    try {
      const response = await axios.get('http://ollama:11434/api/tags', {
        timeout: 5000,
      });
      
      const isHealthy = response.status === 200;
      return this.getStatus(key, isHealthy, {
        available: isHealthy,
        models: response.data?.models?.length || 0,
      });
    } catch (error) {
      // Ollama is optional, so we don't fail the health check
      return this.getStatus(key, true, {
        available: false,
        message: 'Ollama service not available',
      });
    }
  }

  async checkEssentialServices(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if essential services are registered and ready
      const checks = {
        database: true, // Assumed checked by TypeORM indicator
        redis: await this.redis.ping().then(() => true).catch(() => false),
        queue: await this.taskQueue.isReady(),
      };
      
      const allHealthy = Object.values(checks).every(check => check);
      
      return this.getStatus(key, allHealthy, checks);
    } catch (error) {
      throw new HealthCheckError(
        'Essential services check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }
}