import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('embeddings')
export class EmbeddingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column('float8', { array: true })
  embedding: number[];

  @Column('jsonb')
  metadata: {
    type: 'task' | 'code' | 'pattern' | 'error' | 'solution' | 'episode';
    source: string;
    agentId?: string;
    taskId?: string;
    tags?: string[];
    timestamp: Date;
  };

  @CreateDateColumn()
  createdAt: Date;
}
