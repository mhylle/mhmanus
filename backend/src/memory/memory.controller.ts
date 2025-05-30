import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('stats')
  async getMemoryStats() {
    return this.memoryService.getMemoryStats();
  }

  @Get('agent/:agentId')
  async getAgentMemory(@Param('agentId') agentId: string) {
    return this.memoryService.getAgentMemory(agentId);
  }

  @Post('search/similar')
  async searchSimilar(@Body() body: { query: string; limit?: number }) {
    return this.memoryService.semantic.searchSimilar(
      body.query,
      body.limit || 10,
    );
  }

  @Get('patterns')
  async getPatterns(@Query('type') type?: string) {
    return this.memoryService.longTerm.getPatterns(type);
  }

  @Get('episodes/recent')
  async getRecentEpisodes(@Query('limit') limit: string = '10') {
    return this.memoryService.episodic.getRecentEpisodes(parseInt(limit));
  }

  @Get('episodes/patterns')
  async analyzeEpisodePatterns() {
    return this.memoryService.episodic.analyzeEpisodePatterns();
  }

  @Get('tasks/history')
  async getTaskHistory(
    @Query('agentId') agentId?: string,
    @Query('limit') limit: string = '20',
  ) {
    return this.memoryService.longTerm.getTaskHistory({
      agentId,
      limit: parseInt(limit),
    });
  }

  @Post('recall')
  async recallSimilarTasks(@Body() task: any) {
    return this.memoryService.recallSimilarTasks(task);
  }

  @Get('interactions/recent')
  async getRecentInteractions(@Query('limit') limit: string = '10') {
    return this.memoryService.shortTerm.getRecentInteractions(parseInt(limit));
  }

  @Get('active-agents')
  async getActiveAgents() {
    return this.memoryService.shortTerm.getActiveAgents();
  }

  @Post('learn/:taskId')
  async learnFromTask(@Param('taskId') taskId: string) {
    await this.memoryService.learnFromSuccess(taskId);
    return { message: `Learning from task ${taskId} completed` };
  }

  @Get('embeddings/stats')
  async getEmbeddingStats() {
    return this.memoryService.semantic.getEmbeddingStats();
  }

  @Get('episodes/stats')
  async getEpisodeStats() {
    return this.memoryService.episodic.getEpisodeStats();
  }
}
