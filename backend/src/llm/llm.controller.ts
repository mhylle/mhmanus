import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { LLMService } from './llm.service';
import { CompletionDto } from './dto/completion.dto';

@Controller('llm')
export class LLMController {
  constructor(private readonly llmService: LLMService) {}

  @Post('completion')
  async generateCompletion(@Body() dto: CompletionDto) {
    return this.llmService.generateCompletion(dto.prompt, dto.options);
  }

  @Get('health')
  async checkHealth() {
    const health = await this.llmService.checkProviderHealth();
    return {
      providers: Object.fromEntries(health),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('providers')
  getProviders() {
    return {
      providers: this.llmService.getAvailableProviders(),
    };
  }

  @Get('providers/:name')
  getProviderInfo(@Param('name') name: string) {
    return this.llmService.getProviderInfo(name);
  }
}
