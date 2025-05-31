import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { ExecutionMetrics, ToolUsageMetric } from '../interfaces/learning.interface';

@Entity('learning_metrics')
@Index(['agentId', 'taskId'])
@Index(['createdAt'])
export class LearningMetric implements ExecutionMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentId: string;

  @Column()
  taskId: string;

  @Column('float')
  executionTime: number;

  @Column('float')
  memoryUsage: number;

  @Column('jsonb')
  toolsUsed: ToolUsageMetric[];

  @Column()
  success: boolean;

  @Column('int', { default: 0 })
  errorCount: number;

  @Column('float', { nullable: true })
  outputQuality?: number;

  @Column('jsonb', { nullable: true })
  context?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}