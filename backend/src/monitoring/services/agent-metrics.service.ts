import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class AgentMetricsService {
  private agentStartTimes: Map<string, number> = new Map();

  constructor(
    @InjectMetric('agent_execution_duration')
    private readonly executionDuration: Histogram<string>,
    
    @InjectMetric('agent_execution_total')
    private readonly executionCounter: Counter<string>,
    
    @InjectMetric('agent_active')
    private readonly activeAgentsGauge: Gauge<string>,
    
    @InjectMetric('tool_usage_total')
    private readonly toolUsageCounter: Counter<string>,
    
    @InjectMetric('tool_execution_duration')
    private readonly toolDuration: Histogram<string>,
  ) {}

  @OnEvent('agent.execution.start')
  handleExecutionStart(payload: { agentId: string; taskId: string; agentType?: string }) {
    const key = `${payload.agentId}:${payload.taskId}`;
    this.agentStartTimes.set(key, Date.now());
    
    // Increment active agents
    const agentType = payload.agentType || 'unknown';
    this.activeAgentsGauge.labels(agentType).inc();
  }

  @OnEvent('agent.execution.complete')
  handleExecutionComplete(payload: { 
    agentId: string; 
    taskId: string; 
    success: boolean;
    agentType?: string;
    taskType?: string;
  }) {
    const key = `${payload.agentId}:${payload.taskId}`;
    const startTime = this.agentStartTimes.get(key);
    
    if (startTime) {
      const duration = Date.now() - startTime;
      const agentType = payload.agentType || 'unknown';
      const taskType = payload.taskType || 'unknown';
      
      // Record execution duration
      this.executionDuration.labels(agentType, taskType).observe(duration / 1000);
      
      // Increment execution counter
      this.executionCounter.labels(agentType, payload.success ? 'success' : 'failure').inc();
      
      // Decrement active agents
      this.activeAgentsGauge.labels(agentType).dec();
      
      // Clean up
      this.agentStartTimes.delete(key);
    }
  }

  @OnEvent('agent.tool.used')
  handleToolUsage(payload: {
    agentId: string;
    taskId: string;
    tool: {
      toolName: string;
      category: string;
      executionTime: number;
      success: boolean;
    };
  }) {
    const { tool } = payload;
    
    // Record tool usage
    this.toolUsageCounter.labels(tool.toolName, tool.success ? 'success' : 'failure').inc();
    
    // Record tool execution duration
    this.toolDuration.labels(tool.toolName, tool.category).observe(tool.executionTime / 1000);
  }

  // Manual methods for tracking
  recordAgentExecution(
    agentType: string,
    taskType: string,
    duration: number,
    success: boolean,
  ) {
    this.executionDuration.labels(agentType, taskType).observe(duration / 1000);
    this.executionCounter.labels(agentType, success ? 'success' : 'failure').inc();
  }

  setActiveAgentsCount(agentType: string, count: number) {
    this.activeAgentsGauge.labels(agentType).set(count);
  }

  recordToolUsage(
    toolName: string,
    category: string,
    duration: number,
    success: boolean,
  ) {
    this.toolUsageCounter.labels(toolName, success ? 'success' : 'failure').inc();
    this.toolDuration.labels(toolName, category).observe(duration / 1000);
  }
}