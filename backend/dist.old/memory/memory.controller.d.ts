import { MemoryService } from './memory.service';
export declare class MemoryController {
    private readonly memoryService;
    constructor(memoryService: MemoryService);
    getMemoryStats(): Promise<import("./interfaces/memory.interface").MemoryStats>;
    getAgentMemory(agentId: string): Promise<{
        context: import("../agents/interfaces/agent.interface").AgentContext | null;
        recentTasks: import("./interfaces/memory.interface").TaskMemory[];
        patterns: any[];
    }>;
    searchSimilar(body: {
        query: string;
        limit?: number;
    }): Promise<import("./interfaces/memory.interface").SimilarityResult[]>;
    getPatterns(type?: string): Promise<import("./interfaces/memory.interface").LearnedPattern[]>;
    getRecentEpisodes(limit?: string): Promise<import("./interfaces/memory.interface").Episode[]>;
    analyzeEpisodePatterns(): Promise<import("./interfaces/memory.interface").EpisodePattern[]>;
    getTaskHistory(agentId?: string, limit?: string): Promise<import("./interfaces/memory.interface").TaskMemory[]>;
    recallSimilarTasks(task: any): Promise<{
        similar: import("./interfaces/memory.interface").TaskMemory[];
        episodes: import("./interfaces/memory.interface").Episode[];
        patterns: any[];
    }>;
    getRecentInteractions(limit?: string): Promise<import("./interfaces/memory.interface").Interaction[]>;
    getActiveAgents(): Promise<string[]>;
    learnFromTask(taskId: string): Promise<{
        message: string;
    }>;
    getEmbeddingStats(): Promise<{
        total: number;
        byType: Record<string, number>;
        averageSimilarity?: number;
    }>;
    getEpisodeStats(): Promise<{
        total: number;
        successful: number;
        failed: number;
        byTaskType: Record<string, {
            total: number;
            successRate: number;
        }>;
        averageDuration: number;
    }>;
}
