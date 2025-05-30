import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  IAgentCommunicationBus,
  AgentMessage,
  MessageType,
} from '../interfaces/agent.interface';

@Injectable()
export class AgentCommunicationBus implements IAgentCommunicationBus {
  private readonly logger = new Logger(AgentCommunicationBus.name);
  private readonly handlers = new Map<
    string,
    (message: AgentMessage) => Promise<void>
  >();
  private readonly messageHistory: AgentMessage[] = [];
  private readonly maxHistorySize = 1000;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async send(message: AgentMessage): Promise<void> {
    // Add message ID and timestamp if not present
    if (!message.id) {
      message.id = uuidv4();
    }
    if (!message.timestamp) {
      message.timestamp = new Date();
    }

    // Log message
    this.logger.debug(
      `Message ${message.id}: ${message.from} -> ${message.to}`,
    );

    // Store in history
    this.addToHistory(message);

    // Handle broadcast
    if (message.to === 'broadcast') {
      await this.broadcast(message);
      return;
    }

    // Send to specific agent
    const handler = this.handlers.get(message.to);
    if (handler) {
      try {
        await handler(message);

        // Emit event for monitoring
        this.eventEmitter.emit('agent.message.sent', {
          messageId: message.id,
          from: message.from,
          to: message.to,
          type: message.type,
        });
      } catch (error) {
        this.logger.error(`Failed to deliver message ${message.id}`, error);

        // Send error response back to sender
        await this.sendError(message.from, message.id, error.message);
      }
    } else {
      this.logger.warn(`No handler found for agent: ${message.to}`);
      await this.sendError(message.from, message.id, 'Agent not found');
    }
  }

  subscribe(
    agentId: string,
    handler: (message: AgentMessage) => Promise<void>,
  ): void {
    this.handlers.set(agentId, handler);
    this.logger.log(`Agent ${agentId} subscribed to message bus`);
  }

  unsubscribe(agentId: string): void {
    this.handlers.delete(agentId);
    this.logger.log(`Agent ${agentId} unsubscribed from message bus`);
  }

  async broadcast(message: AgentMessage): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [agentId, handler] of this.handlers.entries()) {
      if (agentId !== message.from) {
        promises.push(
          handler(message).catch((error) => {
            this.logger.error(`Broadcast to ${agentId} failed`, error);
          }),
        );
      }
    }

    await Promise.all(promises);

    this.eventEmitter.emit('agent.message.broadcast', {
      messageId: message.id,
      from: message.from,
      type: message.type,
      recipientCount: promises.length,
    });
  }

  private async sendError(
    to: string,
    correlationId: string,
    error: string,
  ): Promise<void> {
    const errorMessage: AgentMessage = {
      id: uuidv4(),
      from: 'system',
      to,
      type: MessageType.ERROR,
      payload: { error, originalMessageId: correlationId },
      timestamp: new Date(),
      correlationId,
    };

    const handler = this.handlers.get(to);
    if (handler) {
      await handler(errorMessage);
    }
  }

  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message);

    // Keep history size under control
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  getMessageHistory(filter?: {
    from?: string;
    to?: string;
    type?: MessageType;
    since?: Date;
  }): AgentMessage[] {
    let filtered = [...this.messageHistory];

    if (filter) {
      if (filter.from) {
        filtered = filtered.filter((m) => m.from === filter.from);
      }
      if (filter.to) {
        filtered = filtered.filter((m) => m.to === filter.to);
      }
      if (filter.type) {
        filtered = filtered.filter((m) => m.type === filter.type);
      }
      if (filter.since) {
        filtered = filtered.filter((m) => m.timestamp >= filter.since!);
      }
    }

    return filtered;
  }

  getActiveAgents(): string[] {
    return Array.from(this.handlers.keys());
  }

  getMessageStats(): Record<string, any> {
    const stats = {
      totalMessages: this.messageHistory.length,
      activeAgents: this.handlers.size,
      messagesByType: {} as Record<MessageType, number>,
      messagesByAgent: {} as Record<string, number>,
    };

    for (const message of this.messageHistory) {
      // Count by type
      stats.messagesByType[message.type] =
        (stats.messagesByType[message.type] || 0) + 1;

      // Count by sender
      stats.messagesByAgent[message.from] =
        (stats.messagesByAgent[message.from] || 0) + 1;
    }

    return stats;
  }
}
