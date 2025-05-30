import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { LLMModule } from '../llm/llm.module';
import { MemoryService } from './memory.service';
import { ShortTermMemoryService } from './services/short-term-memory.service';
import { LongTermMemoryService } from './services/long-term-memory.service';
import { SemanticMemoryService } from './services/semantic-memory.service';
import { EpisodicMemoryService } from './services/episodic-memory.service';
import { MemoryController } from './memory.controller';
import {
  TaskMemoryEntity,
  LearnedPatternEntity,
  CodeSnippetEntity,
  EpisodeEntity,
} from './entities/task-memory.entity';
import { EmbeddingEntity } from './entities/embedding.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskMemoryEntity,
      LearnedPatternEntity,
      CodeSnippetEntity,
      EpisodeEntity,
      EmbeddingEntity,
    ]),
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://redis:6379',
    }),
    LLMModule,
  ],
  controllers: [MemoryController],
  providers: [
    MemoryService,
    ShortTermMemoryService,
    LongTermMemoryService,
    SemanticMemoryService,
    EpisodicMemoryService,
  ],
  exports: [MemoryService],
})
export class MemoryModule {}
