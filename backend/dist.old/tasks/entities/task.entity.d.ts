export declare enum TaskStatus {
    PENDING = "pending",
    QUEUED = "queued",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum TaskPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare class Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    metadata: Record<string, any>;
    result: Record<string, any>;
    error: string;
    assignedAgentId: string;
    retryCount: number;
    maxRetries: number;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date;
    completedAt: Date;
    estimatedDuration: number;
    actualDuration: number;
}
