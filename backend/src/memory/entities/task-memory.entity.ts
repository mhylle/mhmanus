import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('task_memories')
@Index(['agentId', 'timestamp'])
@Index(['success', 'timestamp'])
export class TaskMemoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  taskId: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  agentId: string;

  @Column('jsonb')
  plan: any;

  @Column('jsonb')
  result: any;

  @Column()
  success: boolean;

  @Column()
  tokensUsed: number;

  @Column()
  duration: number;

  @Column('text', { array: true, nullable: true })
  patterns: string[];

  @CreateDateColumn()
  timestamp: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('learned_patterns')
@Index(['type', 'successRate'])
export class LearnedPatternEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

  @Column('text')
  pattern: string;

  @Column('text')
  description: string;

  @Column('text', { array: true })
  examples: string[];

  @Column('float')
  successRate: number;

  @Column({ default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;
}

@Entity('code_snippets')
@Index(['language', 'usageCount'])
@Index(['tags'])
export class CodeSnippetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  language: string;

  @Column()
  purpose: string;

  @Column('text')
  code: string;

  @Column('text', { array: true })
  tags: string[];

  @Column({ default: 0 })
  usageCount: number;

  @Column('float', { default: 0 })
  successRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;
}

@Entity('episodes')
@Index(['taskId'])
@Index(['agentId', 'success'])
@Index(['taskType', 'success'])
export class EpisodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  taskId: string;

  @Column()
  agentId: string;

  @Column()
  taskType: string;

  @Column()
  startTime: Date;

  @Column()
  endTime: Date;

  @Column()
  success: boolean;

  @Column('jsonb')
  steps: any[];

  @Column('jsonb')
  decisions: any[];

  @Column('jsonb')
  outcome: any;

  @Column('text', { array: true, nullable: true })
  learnings: string[];

  @CreateDateColumn()
  createdAt: Date;
}
