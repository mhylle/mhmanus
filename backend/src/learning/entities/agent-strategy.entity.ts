import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { AdaptationStrategy, StrategyCondition, StrategyAction } from '../interfaces/learning.interface';

@Entity('agent_strategies')
@Index(['agentType', 'taskType'])
@Index(['enabled', 'priority'])
export class AgentStrategy implements AdaptationStrategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  agentType: string;

  @Column()
  taskType: string;

  @Column('jsonb')
  conditions: StrategyCondition[];

  @Column('jsonb')
  actions: StrategyAction[];

  @Column('int')
  priority: number;

  @Column('float', { default: 0 })
  successRate: number;

  @Column({ default: true })
  enabled: boolean;

  @Column('int', { default: 0 })
  applicationCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}