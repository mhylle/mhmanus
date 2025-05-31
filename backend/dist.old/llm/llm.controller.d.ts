import { LLMService } from './llm.service';
import { CompletionDto } from './dto/completion.dto';
export declare class LLMController {
    private readonly llmService;
    constructor(llmService: LLMService);
    generateCompletion(dto: CompletionDto): Promise<import("./interfaces/llm-provider.interface").LLMResponse>;
    checkHealth(): Promise<{
        providers: {
            [k: string]: boolean;
        };
        timestamp: string;
    }>;
    getProviders(): {
        providers: string[];
    };
    getProviderInfo(name: string): import("./interfaces/llm-provider.interface").ModelInfo | undefined;
}
