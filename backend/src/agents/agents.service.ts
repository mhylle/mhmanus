import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '../tasks/entities/task.entity';
import { AgentRegistry } from './agent.registry';
import { AgentCommunicationBus } from './communication/agent-communication.bus';
import { MemoryService } from '../memory/memory.service';
import {
  AgentContext,
  ExecutionTrace,
  AgentResult,
  MessageType,
} from './interfaces/agent.interface';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly communicationBus: AgentCommunicationBus,
    private readonly memoryService: MemoryService,
  ) {}

  async processTask(task: Task): Promise<AgentResult> {
    this.logger.log(`Processing task ${task.id} with agent system`);

    // Create execution context
    const context = this.createContext(task);

    // Find the best agent for the task
    const agent = await this.agentRegistry.findBestAgentForTask(task);
    if (!agent) {
      throw new Error('No suitable agent found for task');
    }

    this.logger.log(
      `Selected agent: ${agent.metadata.name} for task ${task.id}`,
    );

    try {
      // Create execution plan
      const plan = await agent.plan(task, context);

      this.logger.log(`Created plan with ${plan.steps.length} steps`);

      // Execute the plan
      const result = await agent.execute(plan, context);

      // Validate the result
      const isValid = await agent.validate(result);
      if (!isValid) {
        this.logger.warn(`Result validation failed for task ${task.id}`);
      }

      // Complete the trace
      context.trace.endTime = new Date();

      // Store in memory for future learning
      try {
        await this.memoryService.rememberTask(task, result, context);
        this.logger.log(`Stored task ${task.id} in memory for future learning`);
      } catch (memoryError) {
        this.logger.error(`Failed to store task in memory`, memoryError);
      }

      // Return enriched result
      return {
        ...result,
        metadata: {
          agentId: agent.metadata.id,
          agentName: agent.metadata.name,
          trace: context.trace,
          contextData: Object.fromEntries(context.sharedMemory),
        },
      } as any;
    } catch (error) {
      this.logger.error(`Failed to process task ${task.id}`, error);

      return {
        success: false,
        output: null,
        reasoning: `Processing failed: ${error.message}`,
        tokensUsed: 0,
        duration: Date.now() - context.trace.startTime.getTime(),
      };
    }
  }

  private createContext(task: Task): AgentContext {
    return {
      taskId: task.id,
      sessionId: uuidv4(),
      sharedMemory: new Map(),
      trace: {
        spans: [],
        startTime: new Date(),
      },
    };
  }

  async getAgentStatus() {
    return {
      registry: this.agentRegistry.getAgentStats(),
      communication: this.communicationBus.getMessageStats(),
      activeAgents: this.communicationBus.getActiveAgents(),
    };
  }

  async testAgentCommunication() {
    // Send a test broadcast message
    await this.communicationBus.broadcast({
      id: uuidv4(),
      from: 'system',
      to: 'broadcast',
      type: MessageType.STATUS_UPDATE,
      payload: { status: 'Communication test' },
      timestamp: new Date(),
    });

    return {
      success: true,
      activeAgents: this.communicationBus.getActiveAgents(),
    };
  }

  async getExecutionTrace(sessionId: string): Promise<ExecutionTrace | null> {
    // In a real implementation, this would retrieve from a trace store
    // For now, return from message history
    const messages = this.communicationBus.getMessageHistory({
      since: new Date(Date.now() - 3600000), // Last hour
    });

    if (messages.length === 0) {
      return null;
    }

    // Construct a trace from messages
    const trace: ExecutionTrace = {
      spans: messages.map((msg) => ({
        spanId: msg.id,
        agentId: msg.from,
        operation: msg.type,
        startTime: msg.timestamp,
        endTime: msg.timestamp,
        attributes: {
          to: msg.to,
          type: msg.type,
        },
        events: [],
      })),
      startTime: messages[0]?.timestamp || new Date(),
      endTime: messages[messages.length - 1]?.timestamp || new Date(),
    };

    return trace;
  }
}
