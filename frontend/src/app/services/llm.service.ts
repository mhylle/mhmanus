import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CompletionRequest {
  prompt: string;
  options?: {
    provider?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export interface CompletionResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class LLMService {
  private apiUrl = 'http://localhost:3000/llm';
  
  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);

  constructor(private http: HttpClient) {}

  generateCompletion(request: CompletionRequest): Observable<CompletionResponse> {
    return this.http.post<CompletionResponse>(`${this.apiUrl}/completion`, request);
  }

  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  getProviders(): Observable<{ providers: string[] }> {
    return this.http.get<{ providers: string[] }>(`${this.apiUrl}/providers`);
  }

  addMessage(message: ChatMessage) {
    this.messages.update(messages => [...messages, message]);
  }

  async sendMessage(content: string) {
    this.isLoading.set(true);
    
    // Add user message
    this.addMessage({
      role: 'user',
      content,
      timestamp: new Date(),
    });

    try {
      const response = await this.generateCompletion({
        prompt: content,
      }).toPromise();

      if (response) {
        this.addMessage({
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Error generating completion:', error);
      this.addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}