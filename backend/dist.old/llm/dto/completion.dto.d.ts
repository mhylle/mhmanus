export declare class CompletionOptionsDto {
    provider?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    systemPrompt?: string;
}
export declare class CompletionDto {
    prompt: string;
    options?: CompletionOptionsDto;
}
