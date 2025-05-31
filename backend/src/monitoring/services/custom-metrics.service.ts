import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge, Summary } from 'prom-client';

@Injectable()
export class CustomMetricsService {
  constructor(
    @InjectMetric('task_total') 
    public readonly taskCounter: Counter<string>,
    
    @InjectMetric('task_duration_seconds')
    public readonly taskDuration: Histogram<string>,
    
    @InjectMetric('task_queue_size')
    public readonly queueSize: Gauge<string>,
    
    @InjectMetric('llm_tokens_used')
    public readonly tokenUsage: Counter<string>,
    
    @InjectMetric('agent_active')
    public readonly activeAgents: Gauge<string>,
    
    @InjectMetric('tool_usage_total')
    public readonly toolUsage: Counter<string>,
    
    @InjectMetric('memory_operation_duration')
    public readonly memoryOperationDuration: Summary<string>,
    
    @InjectMetric('api_request_duration')
    public readonly apiRequestDuration: Histogram<string>,
  ) {}

  // Task metrics
  incrementTaskCount(status: string, type: string) {
    this.taskCounter.labels(status, type).inc();
  }

  recordTaskDuration(duration: number, type: string, status: string) {
    this.taskDuration.labels(type, status).observe(duration / 1000); // Convert to seconds
  }

  setQueueSize(size: number, priority: string) {
    this.queueSize.labels(priority).set(size);
  }

  // LLM metrics
  incrementTokenUsage(model: string, tokens: number) {
    this.tokenUsage.labels(model).inc(tokens);
  }

  // Agent metrics
  setActiveAgents(count: number, type: string) {
    this.activeAgents.labels(type).set(count);
  }

  // Tool metrics
  incrementToolUsage(toolName: string, success: string) {
    this.toolUsage.labels(toolName, success).inc();
  }

  // Memory metrics
  recordMemoryOperation(duration: number, operation: string, memoryType: string) {
    this.memoryOperationDuration.labels(operation, memoryType).observe(duration);
  }

  // API metrics
  recordApiRequest(duration: number, method: string, path: string, statusCode: string) {
    this.apiRequestDuration.labels(method, path, statusCode).observe(duration / 1000);
  }
}