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
var OllamaProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let OllamaProvider = OllamaProvider_1 = class OllamaProvider {
    configService;
    name = 'ollama';
    logger = new common_1.Logger(OllamaProvider_1.name);
    client;
    baseUrl;
    model;
    constructor(configService) {
        this.configService = configService;
        this.baseUrl = this.configService.get('OLLAMA_URL', 'http://localhost:11434');
        this.model = this.configService.get('OLLAMA_MODEL', 'mistral:7b');
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 300000,
        });
    }
    async generateCompletion(prompt, options) {
        try {
            let finalPrompt;
            if (typeof prompt === 'string') {
                finalPrompt = options?.systemPrompt
                    ? `${options.systemPrompt}\n\n${prompt}`
                    : prompt;
            }
            else {
                finalPrompt = prompt.messages
                    .map((msg) => {
                    if (msg.role === 'system')
                        return `System: ${msg.content}`;
                    if (msg.role === 'user')
                        return `User: ${msg.content}`;
                    if (msg.role === 'assistant')
                        return `Assistant: ${msg.content}`;
                    return msg.content;
                })
                    .join('\n\n');
            }
            const response = await this.client.post('/api/generate', {
                model: this.model,
                prompt: finalPrompt,
                options: {
                    temperature: options?.temperature ?? 0.7,
                    top_p: options?.topP ?? 0.9,
                    top_k: options?.topK ?? 40,
                    num_predict: options?.maxTokens ?? 1024,
                    stop: options?.stopSequences,
                },
                stream: false,
            });
            return {
                content: response.data.response,
                model: this.model,
                provider: this.name,
                usage: {
                    promptTokens: response.data.prompt_eval_count || 0,
                    completionTokens: response.data.eval_count || 0,
                    totalTokens: (response.data.prompt_eval_count || 0) +
                        (response.data.eval_count || 0),
                },
                metadata: {
                    duration: response.data.total_duration,
                    evalDuration: response.data.eval_duration,
                },
            };
        }
        catch (error) {
            this.logger.error(`Ollama completion failed: ${error.message}`);
            throw new Error(`Ollama completion failed: ${error.message}`);
        }
    }
    async isAvailable() {
        try {
            const response = await this.client.get('/api/tags');
            const models = response.data.models || [];
            return models.some((model) => model.name === this.model);
        }
        catch (error) {
            this.logger.warn(`Ollama health check failed: ${error.message}`);
            return false;
        }
    }
    getModelInfo() {
        return {
            name: this.model,
            provider: this.name,
            capabilities: ['general', 'reasoning', 'code'],
            contextLength: 8192,
        };
    }
};
exports.OllamaProvider = OllamaProvider;
exports.OllamaProvider = OllamaProvider = OllamaProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OllamaProvider);
//# sourceMappingURL=ollama.provider.js.map