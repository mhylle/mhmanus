import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  LLMProvider,
  LLMOptions,
  LLMResponse,
  ModelInfo,
  ChatCompletionRequest,
} from '../interfaces/llm-provider.interface';

@Injectable()
export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'OLLAMA_URL',
      'http://localhost:11434',
    );
    this.model = this.configService.get<string>('OLLAMA_MODEL', 'mistral:7b');

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 300000, // 5 minutes
    });
  }

  async generateCompletion(
    prompt: string | ChatCompletionRequest,
    options?: LLMOptions,
  ): Promise<LLMResponse> {
    try {
      let finalPrompt: string;

      if (typeof prompt === 'string') {
        finalPrompt = options?.systemPrompt
          ? `${options.systemPrompt}\n\n${prompt}`
          : prompt;
      } else {
        // Convert messages to a single prompt
        finalPrompt = prompt.messages
          .map((msg) => {
            if (msg.role === 'system') return `System: ${msg.content}`;
            if (msg.role === 'user') return `User: ${msg.content}`;
            if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
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
          totalTokens:
            (response.data.prompt_eval_count || 0) +
            (response.data.eval_count || 0),
        },
        metadata: {
          duration: response.data.total_duration,
          evalDuration: response.data.eval_duration,
        },
      };
    } catch (error) {
      this.logger.error(`Ollama completion failed: ${error.message}`);
      throw new Error(`Ollama completion failed: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      return models.some((model: any) => model.name === this.model);
    } catch (error) {
      this.logger.warn(`Ollama health check failed: ${error.message}`);
      return false;
    }
  }

  getModelInfo(): ModelInfo {
    return {
      name: this.model,
      provider: this.name,
      capabilities: ['general', 'reasoning', 'code'],
      contextLength: 8192,
    };
  }
}
