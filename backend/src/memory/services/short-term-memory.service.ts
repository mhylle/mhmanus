import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { IShortTermMemory, Interaction } from '../interfaces/memory.interface';
import { AgentContext } from '../../agents/interfaces/agent.interface';

@Injectable()
export class ShortTermMemoryService implements IShortTermMemory {
  private readonly logger = new Logger(ShortTermMemoryService.name);
  private readonly contextPrefix = 'stm:context:';
  private readonly interactionPrefix = 'stm:interaction:';
  private readonly interactionListKey = 'stm:interactions:list';
  private readonly defaultTTL = 3600; // 1 hour

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async store(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.setex(key, this.defaultTTL, serialized);
    }
    this.logger.debug(`Stored in short-term memory: ${key}`);
  }

  async retrieve(key: string): Promise<any | null> {
    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug(`Deleted from short-term memory: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async clear(): Promise<void> {
    // Clear all short-term memory keys
    const keys = await this.redis.keys('stm:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    this.logger.log(`Cleared ${keys.length} items from short-term memory`);
  }

  // Context management
  async setContext(agentId: string, context: AgentContext): Promise<void> {
    const key = `${this.contextPrefix}${agentId}`;
    const contextToStore = {
      ...context,
      sharedMemory: Array.from(context.sharedMemory.entries()),
    };
    await this.store(key, contextToStore, 7200); // 2 hours TTL for context
    this.logger.debug(`Set context for agent ${agentId}`);
  }

  async getContext(agentId: string): Promise<AgentContext | null> {
    const key = `${this.contextPrefix}${agentId}`;
    const context = await this.retrieve(key);

    if (!context) return null;

    // Reconstruct Map from array and restore dates
    return {
      ...context,
      sharedMemory: new Map(context.sharedMemory),
      trace: {
        ...context.trace,
        startTime: new Date(context.trace.startTime),
        endTime: context.trace.endTime
          ? new Date(context.trace.endTime)
          : undefined,
      },
    };
  }

  async updateContext(
    agentId: string,
    updates: Partial<AgentContext>,
  ): Promise<void> {
    const current = await this.getContext(agentId);
    if (!current) {
      throw new Error(`No context found for agent ${agentId}`);
    }

    const updated: AgentContext = {
      ...current,
      ...updates,
    };

    await this.setContext(agentId, updated);
  }

  // Interaction tracking
  async addInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.id) {
      interaction.id = uuidv4();
    }

    const key = `${this.interactionPrefix}${interaction.id}`;
    await this.store(key, interaction, 3600); // 1 hour TTL

    // Add to interaction list
    await this.redis.lpush(this.interactionListKey, interaction.id);
    await this.redis.ltrim(this.interactionListKey, 0, 999); // Keep last 1000
    await this.redis.expire(this.interactionListKey, 3600);

    this.logger.debug(
      `Added interaction ${interaction.id} for agent ${interaction.agentId}`,
    );
  }

  async getRecentInteractions(limit: number = 10): Promise<Interaction[]> {
    const interactionIds = await this.redis.lrange(
      this.interactionListKey,
      0,
      limit - 1,
    );
    const interactions: Interaction[] = [];

    for (const id of interactionIds) {
      const interaction = await this.retrieve(`${this.interactionPrefix}${id}`);
      if (interaction) {
        interactions.push({
          ...interaction,
          timestamp: new Date(interaction.timestamp),
        });
      }
    }

    return interactions;
  }

  // Additional utility methods
  async getMemoryStats(): Promise<{
    contextCount: number;
    interactionCount: number;
    memoryInfo: any;
  }> {
    const contextKeys = await this.redis.keys(`${this.contextPrefix}*`);
    const interactionCount = await this.redis.llen(this.interactionListKey);
    const memoryInfo = await this.redis.info('memory');

    return {
      contextCount: contextKeys.length,
      interactionCount,
      memoryInfo,
    };
  }

  async extendTTL(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  async getActiveAgents(): Promise<string[]> {
    const contextKeys = await this.redis.keys(`${this.contextPrefix}*`);
    return contextKeys.map((key) => key.replace(this.contextPrefix, ''));
  }
}
