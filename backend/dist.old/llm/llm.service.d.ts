import { OnModuleInit } from '@nestjs/common';
import { LLMOptions, LLMResponse, ChatCompletionRequest } from './interfaces/llm-provider.interface';
import { OllamaProvider } from './providers/ollama.provider';
export declare class LLMService implements OnModuleInit {
    private ollamaProvider;
    private readonly logger;
    private providers;
    private defaultProvider;
    constructor(ollamaProvider: OllamaProvider);
    onModuleInit(): Promise<void>;
    private registerProvider;
    generateCompletion(prompt: string | ChatCompletionRequest, options?: LLMOptions & {
        provider?: string;
    }): Promise<LLMResponse>;
    checkProviderHealth(): Promise<Map<string, boolean>>;
    getAvailableProviders(): string[];
    getProviderInfo(providerName: string): import("./interfaces/llm-provider.interface").ModelInfo | undefined;
}
