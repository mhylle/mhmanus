import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningService } from './services/learning.service';
import { PatternRecognitionService } from './services/pattern-recognition.service';
import { AdaptationService } from './services/adaptation.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { LearningController } from './learning.controller';
import { ExecutionPattern } from './entities/execution-pattern.entity';
import { LearningMetric } from './entities/learning-metric.entity';
import { AgentStrategy } from './entities/agent-strategy.entity';
import { MemoryModule } from '../memory/memory.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExecutionPattern,
      LearningMetric,
      AgentStrategy,
    ]),
    MemoryModule,
    AgentsModule,
  ],
  controllers: [LearningController],
  providers: [
    LearningService,
    PatternRecognitionService,
    AdaptationService,
    MetricsCollectorService,
  ],
  exports: [
    LearningService,
    MetricsCollectorService,
    AdaptationService,
  ],
})
export class LearningModule {}