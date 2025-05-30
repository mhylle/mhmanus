import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  LLMProvider,
  LLMOptions,
  LLMResponse,
  ChatCompletionRequest,
} from './interfaces/llm-provider.interface';
import { OllamaProvider } from './providers/ollama.provider';

@Injectable()
export class LLMService implements OnModuleInit {
  private readonly logger = new Logger(LLMService.name);
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string = 'ollama';

  constructor(private ollamaProvider: OllamaProvider) {
    this.registerProvider(ollamaProvider);
  }

  async onModuleInit() {
    await this.checkProviderHealth();
  }

  private registerProvider(provider: LLMProvider) {
    this.providers.set(provider.name, provider);
    this.logger.log(`Registered LLM provider: ${provider.name}`);
  }

  async generateCompletion(
    prompt: string | ChatCompletionRequest,
    options?: LLMOptions & { provider?: string },
  ): Promise<LLMResponse> {
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

  async checkProviderHealth(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      const isHealthy = await provider.isAvailable();
      health.set(name, isHealthy);
      this.logger.log(
        `Provider ${name} health: ${isHealthy ? 'OK' : 'FAILED'}`,
      );
    }

    return health;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderInfo(providerName: string) {
    const provider = this.providers.get(providerName);
    return provider?.getModelInfo();
  }
}
