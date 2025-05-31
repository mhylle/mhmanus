export declare class TaskMemoryEntity {
    id: string;
    taskId: string;
    title: string;
    description: string;
    agentId: string;
    plan: any;
    result: any;
    success: boolean;
    tokensUsed: number;
    duration: number;
    patterns: string[];
    timestamp: Date;
    updatedAt: Date;
}
export declare class LearnedPatternEntity {
    id: string;
    type: string;
    pattern: string;
    description: string;
    examples: string[];
    successRate: number;
    usageCount: number;
    createdAt: Date;
    lastUsed: Date;
}
export declare class CodeSnippetEntity {
    id: string;
    language: string;
    purpose: string;
    code: string;
    tags: string[];
    usageCount: number;
    successRate: number;
    createdAt: Date;
    lastUsed: Date;
}
export declare class EpisodeEntity {
    id: string;
    taskId: string;
    agentId: string;
    taskType: string;
    startTime: Date;
    endTime: Date;
    success: boolean;
    steps: any[];
    decisions: any[];
    outcome: any;
    learnings: string[];
    createdAt: Date;
}
