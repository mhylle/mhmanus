import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IAgent, AgentType } from './interfaces/agent.interface';
import { DirectorAgent } from './director/director.agent';
import { CodeAgent } from './code/code.agent';

@Injectable()
export class AgentRegistry implements OnModuleInit {
  private readonly logger = new Logger(AgentRegistry.name);
  private readonly agents = new Map<string, IAgent>();
  private readonly agentsByType = new Map<AgentType, IAgent[]>();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    await this.registerAgents();
  }

  private async registerAgents() {
    // Register all agent types
    const agentClasses = [
      DirectorAgent,
      CodeAgent,
      // Add more agents as they are implemented
    ];

    for (const AgentClass of agentClasses) {
      try {
        const agent = this.moduleRef.get(AgentClass, { strict: false });
        if (agent) {
          await this.registerAgent(agent);
        }
      } catch (error) {
        this.logger.error(`Failed to register agent ${AgentClass.name}`, error);
      }
    }

    this.logger.log(`Registered ${this.agents.size} agents`);
  }

  async registerAgent(agent: IAgent): Promise<void> {
    await agent.initialize();

    this.agents.set(agent.metadata.id, agent);

    if (!this.agentsByType.has(agent.metadata.type)) {
      this.agentsByType.set(agent.metadata.type, []);
    }
    this.agentsByType.get(agent.metadata.type)!.push(agent);

    this.logger.log(
      `Registered agent: ${agent.metadata.name} (${agent.metadata.type})`,
    );
  }

  getAgent(agentId: string): IAgent | undefined {
    return this.agents.get(agentId);
  }

  getAgentsByType(type: AgentType): IAgent[] {
    return this.agentsByType.get(type) || [];
  }

  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  getDirectorAgent(): IAgent | undefined {
    const directors = this.getAgentsByType(AgentType.DIRECTOR);
    return directors[0]; // Return first director
  }

  async findBestAgentForTask(task: any): Promise<IAgent | undefined> {
    // First, check if task should go to director
    const director = this.getDirectorAgent();
    if (director && (await director.canHandle(task))) {
      return director;
    }

    // Otherwise, find the best specialist
    let bestAgent: IAgent | undefined;
    const highestConfidence = 0;

    for (const agent of this.agents.values()) {
      if (agent.metadata.type !== AgentType.DIRECTOR) {
        const canHandle = await agent.canHandle(task);
        if (canHandle) {
          // For now, just return the first agent that can handle it
          // In future, implement confidence scoring
          return agent;
        }
      }
    }

    // If no specialist can handle it, return director as fallback
    return director;
  }

  getAgentStats(): Record<string, any> {
    const stats: Record<string, any> = {
      totalAgents: this.agents.size,
      agentsByType: {},
    };

    for (const [type, agents] of this.agentsByType.entries()) {
      stats.agentsByType[type] = {
        count: agents.length,
        agents: agents.map((a) => ({
          id: a.metadata.id,
          name: a.metadata.name,
          model: a.metadata.model,
        })),
      };
    }

    return stats;
  }
}
