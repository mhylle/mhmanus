import { ConfigService } from '@nestjs/config';
import { LLMProvider, LLMOptions, LLMResponse, ModelInfo, ChatCompletionRequest } from '../interfaces/llm-provider.interface';
export declare class OllamaProvider implements LLMProvider {
    private configService;
    readonly name = "ollama";
    private readonly logger;
    private readonly client;
    private readonly baseUrl;
    private readonly model;
    constructor(configService: ConfigService);
    generateCompletion(prompt: string | ChatCompletionRequest, options?: LLMOptions): Promise<LLMResponse>;
    isAvailable(): Promise<boolean>;
    getModelInfo(): ModelInfo;
}
