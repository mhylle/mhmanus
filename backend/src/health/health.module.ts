import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    TerminusModule,
    TypeOrmModule,
    BullModule.registerQueue({ name: 'tasks' }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}