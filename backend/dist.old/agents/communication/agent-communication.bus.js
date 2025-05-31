"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AgentCommunicationBus_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCommunicationBus = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const uuid_1 = require("uuid");
const agent_interface_1 = require("../interfaces/agent.interface");
let AgentCommunicationBus = AgentCommunicationBus_1 = class AgentCommunicationBus {
    eventEmitter;
    logger = new common_1.Logger(AgentCommunicationBus_1.name);
    handlers = new Map();
    messageHistory = [];
    maxHistorySize = 1000;
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
    }
    async send(message) {
        if (!message.id) {
            message.id = (0, uuid_1.v4)();
        }
        if (!message.timestamp) {
            message.timestamp = new Date();
        }
        this.logger.debug(`Message ${message.id}: ${message.from} -> ${message.to}`);
        this.addToHistory(message);
        if (message.to === 'broadcast') {
            await this.broadcast(message);
            return;
        }
        const handler = this.handlers.get(message.to);
        if (handler) {
            try {
                await handler(message);
                this.eventEmitter.emit('agent.message.sent', {
                    messageId: message.id,
                    from: message.from,
                    to: message.to,
                    type: message.type,
                });
            }
            catch (error) {
                this.logger.error(`Failed to deliver message ${message.id}`, error);
                await this.sendError(message.from, message.id, error.message);
            }
        }
        else {
            this.logger.warn(`No handler found for agent: ${message.to}`);
            await this.sendError(message.from, message.id, 'Agent not found');
        }
    }
    subscribe(agentId, handler) {
        this.handlers.set(agentId, handler);
        this.logger.log(`Agent ${agentId} subscribed to message bus`);
    }
    unsubscribe(agentId) {
        this.handlers.delete(agentId);
        this.logger.log(`Agent ${agentId} unsubscribed from message bus`);
    }
    async broadcast(message) {
        const promises = [];
        for (const [agentId, handler] of this.handlers.entries()) {
            if (agentId !== message.from) {
                promises.push(handler(message).catch((error) => {
                    this.logger.error(`Broadcast to ${agentId} failed`, error);
                }));
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
    async sendError(to, correlationId, error) {
        const errorMessage = {
            id: (0, uuid_1.v4)(),
            from: 'system',
            to,
            type: agent_interface_1.MessageType.ERROR,
            payload: { error, originalMessageId: correlationId },
            timestamp: new Date(),
            correlationId,
        };
        const handler = this.handlers.get(to);
        if (handler) {
            await handler(errorMessage);
        }
    }
    addToHistory(message) {
        this.messageHistory.push(message);
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
    }
    getMessageHistory(filter) {
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
                filtered = filtered.filter((m) => m.timestamp >= filter.since);
            }
        }
        return filtered;
    }
    getActiveAgents() {
        return Array.from(this.handlers.keys());
    }
    getMessageStats() {
        const stats = {
            totalMessages: this.messageHistory.length,
            activeAgents: this.handlers.size,
            messagesByType: {},
            messagesByAgent: {},
        };
        for (const message of this.messageHistory) {
            stats.messagesByType[message.type] =
                (stats.messagesByType[message.type] || 0) + 1;
            stats.messagesByAgent[message.from] =
                (stats.messagesByAgent[message.from] || 0) + 1;
        }
        return stats;
    }
};
exports.AgentCommunicationBus = AgentCommunicationBus;
exports.AgentCommunicationBus = AgentCommunicationBus = AgentCommunicationBus_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], AgentCommunicationBus);
//# sourceMappingURL=agent-communication.bus.js.map