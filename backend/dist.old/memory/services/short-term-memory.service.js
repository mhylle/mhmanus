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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ShortTermMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortTermMemoryService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const uuid_1 = require("uuid");
let ShortTermMemoryService = ShortTermMemoryService_1 = class ShortTermMemoryService {
    redis;
    logger = new common_1.Logger(ShortTermMemoryService_1.name);
    contextPrefix = 'stm:context:';
    interactionPrefix = 'stm:interaction:';
    interactionListKey = 'stm:interactions:list';
    defaultTTL = 3600;
    constructor(redis) {
        this.redis = redis;
    }
    async store(key, value, ttl) {
        const serialized = JSON.stringify(value);
        if (ttl) {
            await this.redis.setex(key, ttl, serialized);
        }
        else {
            await this.redis.setex(key, this.defaultTTL, serialized);
        }
        this.logger.debug(`Stored in short-term memory: ${key}`);
    }
    async retrieve(key) {
        const value = await this.redis.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    async delete(key) {
        await this.redis.del(key);
        this.logger.debug(`Deleted from short-term memory: ${key}`);
    }
    async exists(key) {
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
    async clear() {
        const keys = await this.redis.keys('stm:*');
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
        this.logger.log(`Cleared ${keys.length} items from short-term memory`);
    }
    async setContext(agentId, context) {
        const key = `${this.contextPrefix}${agentId}`;
        const contextToStore = {
            ...context,
            sharedMemory: Array.from(context.sharedMemory.entries()),
        };
        await this.store(key, contextToStore, 7200);
        this.logger.debug(`Set context for agent ${agentId}`);
    }
    async getContext(agentId) {
        const key = `${this.contextPrefix}${agentId}`;
        const context = await this.retrieve(key);
        if (!context)
            return null;
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
    async updateContext(agentId, updates) {
        const current = await this.getContext(agentId);
        if (!current) {
            throw new Error(`No context found for agent ${agentId}`);
        }
        const updated = {
            ...current,
            ...updates,
        };
        await this.setContext(agentId, updated);
    }
    async addInteraction(interaction) {
        if (!interaction.id) {
            interaction.id = (0, uuid_1.v4)();
        }
        const key = `${this.interactionPrefix}${interaction.id}`;
        await this.store(key, interaction, 3600);
        await this.redis.lpush(this.interactionListKey, interaction.id);
        await this.redis.ltrim(this.interactionListKey, 0, 999);
        await this.redis.expire(this.interactionListKey, 3600);
        this.logger.debug(`Added interaction ${interaction.id} for agent ${interaction.agentId}`);
    }
    async getRecentInteractions(limit = 10) {
        const interactionIds = await this.redis.lrange(this.interactionListKey, 0, limit - 1);
        const interactions = [];
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
    async getMemoryStats() {
        const contextKeys = await this.redis.keys(`${this.contextPrefix}*`);
        const interactionCount = await this.redis.llen(this.interactionListKey);
        const memoryInfo = await this.redis.info('memory');
        return {
            contextCount: contextKeys.length,
            interactionCount,
            memoryInfo,
        };
    }
    async extendTTL(key, ttl) {
        await this.redis.expire(key, ttl);
    }
    async getActiveAgents() {
        const contextKeys = await this.redis.keys(`${this.contextPrefix}*`);
        return contextKeys.map((key) => key.replace(this.contextPrefix, ''));
    }
};
exports.ShortTermMemoryService = ShortTermMemoryService;
exports.ShortTermMemoryService = ShortTermMemoryService = ShortTermMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.Redis])
], ShortTermMemoryService);
//# sourceMappingURL=short-term-memory.service.js.map