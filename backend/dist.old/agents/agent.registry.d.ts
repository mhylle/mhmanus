import { OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IAgent, AgentType } from './interfaces/agent.interface';
export declare class AgentRegistry implements OnModuleInit {
    private readonly moduleRef;
    private readonly logger;
    private readonly agents;
    private readonly agentsByType;
    constructor(moduleRef: ModuleRef);
    onModuleInit(): Promise<void>;
    private registerAgents;
    registerAgent(agent: IAgent): Promise<void>;
    getAgent(agentId: string): IAgent | undefined;
    getAgentsByType(type: AgentType): IAgent[];
    getAllAgents(): IAgent[];
    getDirectorAgent(): IAgent | undefined;
    findBestAgentForTask(task: any): Promise<IAgent | undefined>;
    getAgentStats(): Record<string, any>;
}
