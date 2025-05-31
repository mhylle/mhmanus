import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Pattern, PatternStep } from '../interfaces/learning.interface';

@Entity('execution_patterns')
export class ExecutionPattern implements Pattern {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  taskType: string;

  @Column('jsonb')
  sequence: PatternStep[];

  @Column('float', { default: 0 })
  successRate: number;

  @Column('float', { default: 0 })
  avgExecutionTime: number;

  @Column('int', { default: 0 })
  usageCount: number;

  @Column()
  lastUsed: Date;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}