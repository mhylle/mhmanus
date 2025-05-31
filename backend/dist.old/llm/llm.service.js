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
var LLMService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const common_1 = require("@nestjs/common");
const ollama_provider_1 = require("./providers/ollama.provider");
let LLMService = LLMService_1 = class LLMService {
    ollamaProvider;
    logger = new common_1.Logger(LLMService_1.name);
    providers = new Map();
    defaultProvider = 'ollama';
    constructor(ollamaProvider) {
        this.ollamaProvider = ollamaProvider;
        this.registerProvider(ollamaProvider);
    }
    async onModuleInit() {
        await this.checkProviderHealth();
    }
    registerProvider(provider) {
        this.providers.set(provider.name, provider);
        this.logger.log(`Registered LLM provider: ${provider.name}`);
    }
    async generateCompletion(prompt, options) {
        const providerName = options?.provider || this.defaultProvider;
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} not found`);
        }
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
            throw new Error(`Provider ${providerName} is not available`);
        }
        return provider.generateCompletion(prompt, options);
    }
    async checkProviderHealth() {
        const health = new Map();
        for (const [name, provider] of this.providers) {
            const isHealthy = await provider.isAvailable();
            health.set(name, isHealthy);
            this.logger.log(`Provider ${name} health: ${isHealthy ? 'OK' : 'FAILED'}`);
        }
        return health;
    }
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    getProviderInfo(providerName) {
        const provider = this.providers.get(providerName);
        return provider?.getModelInfo();
    }
};
exports.LLMService = LLMService;
exports.LLMService = LLMService = LLMService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ollama_provider_1.OllamaProvider])
], LLMService);
//# sourceMappingURL=llm.service.js.map