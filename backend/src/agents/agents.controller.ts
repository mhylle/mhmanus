import { Controller, Get, Post, Param } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentRegistry } from './agent.registry';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentRegistry: AgentRegistry,
  ) {}

  @Get()
  async getAllAgents() {
    const agents = this.agentRegistry.getAllAgents();
    return agents.map((agent) => ({
      id: agent.metadata.id,
      name: agent.metadata.name,
      type: agent.metadata.type,
      model: agent.metadata.model,
      description: agent.metadata.description,
      capabilities: agent.metadata.capabilities,
    }));
  }

  @Get('status')
  async getAgentStatus() {
    return this.agentsService.getAgentStatus();
  }

  @Get('registry')
  async getRegistry() {
    return this.agentRegistry.getAgentStats();
  }

  @Get(':agentId')
  async getAgent(@Param('agentId') agentId: string) {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      return { error: 'Agent not found' };
    }

    return {
      id: agent.metadata.id,
      name: agent.metadata.name,
      type: agent.metadata.type,
      model: agent.metadata.model,
      description: agent.metadata.description,
      capabilities: agent.metadata.capabilities,
      maxConcurrentTasks: agent.metadata.maxConcurrentTasks,
    };
  }

  @Post('test-communication')
  async testCommunication() {
    return this.agentsService.testAgentCommunication();
  }

  @Get('trace/:sessionId')
  async getExecutionTrace(@Param('sessionId') sessionId: string) {
    const trace = await this.agentsService.getExecutionTrace(sessionId);
    return trace || { error: 'Trace not found' };
  }
}
