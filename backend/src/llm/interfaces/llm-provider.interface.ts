export interface LLMProvider {
  name: string;
  generateCompletion(
    prompt: string | ChatCompletionRequest,
    options?: LLMOptions,
  ): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
  getModelInfo(): ModelInfo;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface ModelInfo {
  name: string;
  provider: string;
  capabilities: string[];
  contextLength: number;
  costPerToken?: {
    input: number;
    output: number;
  };
}
