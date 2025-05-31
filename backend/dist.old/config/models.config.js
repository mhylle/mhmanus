"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelsConfig = void 0;
exports.modelsConfig = {
    providers: {
        ollama: {
            endpoint: process.env.OLLAMA_URL || 'http://localhost:11434',
            models: {
                general: {
                    name: 'qwen3:14b',
                    capabilities: ['general', 'reasoning', 'conversation'],
                    contextLength: 32768,
                },
                coding: {
                    name: 'devstral:24b',
                    capabilities: ['code', 'debugging', 'testing', 'documentation'],
                    contextLength: 32768,
                },
                fast: {
                    name: 'mistral:7b',
                    capabilities: ['general', 'fast', 'efficient'],
                    contextLength: 8192,
                },
            },
        },
        groq: {
            endpoint: 'https://api.groq.com/v1',
            apiKey: process.env.GROQ_API_KEY,
            models: {
                large: {
                    name: 'llama3-70b',
                    capabilities: ['complex-reasoning', 'planning'],
                    contextLength: 8192,
                },
            },
        },
        mistral: {
            endpoint: 'https://api.mistral.ai/v1',
            apiKey: process.env.MISTRAL_API_KEY,
            models: {
                coding: {
                    name: 'codestral-22b',
                    capabilities: ['code', 'testing', 'documentation'],
                    contextLength: 32768,
                },
            },
        },
    },
    defaultModel: 'ollama:general',
    agentModelMapping: {
        director: 'ollama:general',
        codeSpecialist: 'ollama:coding',
        generalSpecialist: 'ollama:fast',
    },
};
//# sourceMappingURL=models.config.js.map