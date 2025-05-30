import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { TaskProcessor } from './task.processor';
import { TaskGateway } from './task.gateway';
import { LLMModule } from '../llm/llm.module';
import { AgentsModule } from '../agents/agents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    BullModule.registerQueue({
      name: 'tasks',
    }),
    LLMModule,
    forwardRef(() => AgentsModule),
  ],
  controllers: [TasksController],
  providers: [TasksService, TaskProcessor, TaskGateway],
  exports: [TasksService],
})
export class TasksModule {}
