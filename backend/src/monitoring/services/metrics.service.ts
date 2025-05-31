import { Injectable, OnModuleInit } from '@nestjs/common';
import { makeCounterProvider, makeHistogramProvider, makeGaugeProvider, makeSummaryProvider } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService implements OnModuleInit {
  static readonly metrics = [
    // Task metrics
    makeCounterProvider({
      name: 'task_total',
      help: 'Total number of tasks processed',
      labelNames: ['status', 'type'],
    }),
    makeHistogramProvider({
      name: 'task_duration_seconds',
      help: 'Task processing duration in seconds',
      labelNames: ['type', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    }),
    makeGaugeProvider({
      name: 'task_queue_size',
      help: 'Current number of tasks in queue',
      labelNames: ['priority'],
    }),

    // Agent metrics
    makeGaugeProvider({
      name: 'agent_active',
      help: 'Number of active agents',
      labelNames: ['type'],
    }),
    makeHistogramProvider({
      name: 'agent_execution_duration',
      help: 'Agent execution duration in seconds',
      labelNames: ['agent_type', 'task_type'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
    }),
    makeCounterProvider({
      name: 'agent_execution_total',
      help: 'Total agent executions',
      labelNames: ['agent_type', 'status'],
    }),

    // LLM metrics
    makeCounterProvider({
      name: 'llm_tokens_used',
      help: 'Total LLM tokens consumed',
      labelNames: ['model'],
    }),
    makeHistogramProvider({
      name: 'llm_response_time',
      help: 'LLM response time in seconds',
      labelNames: ['model', 'provider'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),

    // Tool metrics
    makeCounterProvider({
      name: 'tool_usage_total',
      help: 'Total tool invocations',
      labelNames: ['tool_name', 'success'],
    }),
    makeHistogramProvider({
      name: 'tool_execution_duration',
      help: 'Tool execution duration in seconds',
      labelNames: ['tool_name', 'category'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),

    // Memory metrics
    makeSummaryProvider({
      name: 'memory_operation_duration',
      help: 'Memory operation duration in milliseconds',
      labelNames: ['operation', 'memory_type'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
    }),
    makeGaugeProvider({
      name: 'memory_size_bytes',
      help: 'Current memory usage in bytes',
      labelNames: ['memory_type'],
    }),

    // API metrics
    makeHistogramProvider({
      name: 'api_request_duration',
      help: 'API request duration in seconds',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    }),

    // System metrics
    makeGaugeProvider({
      name: 'database_connections',
      help: 'Active database connections',
      labelNames: ['state'],
    }),
    makeGaugeProvider({
      name: 'redis_connections',
      help: 'Active Redis connections',
      labelNames: ['state'],
    }),
  ];

  onModuleInit() {
    // Initialize any required metrics on startup
    console.log('Metrics service initialized');
  }

  static getProviders() {
    return this.metrics;
  }
}