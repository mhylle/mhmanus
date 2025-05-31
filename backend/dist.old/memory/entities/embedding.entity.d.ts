export declare class EmbeddingEntity {
    id: string;
    content: string;
    embedding: number[];
    metadata: {
        type: 'task' | 'code' | 'pattern' | 'error' | 'solution' | 'episode';
        source: string;
        agentId?: string;
        taskId?: string;
        tags?: string[];
        timestamp: Date;
    };
    createdAt: Date;
}
