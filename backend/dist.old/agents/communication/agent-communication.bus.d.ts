import { EventEmitter2 } from '@nestjs/event-emitter';
import { IAgentCommunicationBus, AgentMessage, MessageType } from '../interfaces/agent.interface';
export declare class AgentCommunicationBus implements IAgentCommunicationBus {
    private readonly eventEmitter;
    private readonly logger;
    private readonly handlers;
    private readonly messageHistory;
    private readonly maxHistorySize;
    constructor(eventEmitter: EventEmitter2);
    send(message: AgentMessage): Promise<void>;
    subscribe(agentId: string, handler: (message: AgentMessage) => Promise<void>): void;
    unsubscribe(agentId: string): void;
    broadcast(message: AgentMessage): Promise<void>;
    private sendError;
    private addToHistory;
    getMessageHistory(filter?: {
        from?: string;
        to?: string;
        type?: MessageType;
        since?: Date;
    }): AgentMessage[];
    getActiveAgents(): string[];
    getMessageStats(): Record<string, any>;
}
