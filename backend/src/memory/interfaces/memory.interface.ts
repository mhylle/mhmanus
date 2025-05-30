export interface IMemoryLayer {
  store(key: string, value: any, ttl?: number): Promise<void>;
  retrieve(key: string): Promise<any | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface IMemoryService {
  shortTerm: IShortTermMemory;
  longTerm: ILongTermMemory;
  semantic: ISemanticMemory;
  episodic: IEpisodicMemory;
}

export interface IShortTermMemory extends IMemoryLayer {
  // Working memory for current context
  setContext(agentId: string, context: any): Promise<void>;
  getContext(agentId: string): Promise<any | null>;
  updateContext(agentId: string, updates: any): Promise<void>;

  // Recent interactions
  addInteraction(interaction: Interaction): Promise<void>;
  getRecentInteractions(limit: number): Promise<Interaction[]>;
}

export interface ILongTermMemory extends IMemoryLayer {
  // Task history
  storeTaskResult(taskId: string, result: TaskMemory): Promise<void>;
  getTaskHistory(filter?: TaskFilter): Promise<TaskMemory[]>;

  // Learned patterns
  storePattern(pattern: LearnedPattern): Promise<void>;
  getPatterns(type?: string): Promise<LearnedPattern[]>;

  // Code snippets
  storeCodeSnippet(snippet: CodeSnippet): Promise<void>;
  searchCodeSnippets(query: string): Promise<CodeSnippet[]>;
}

export interface ISemanticMemory {
  // Vector embeddings for similarity search
  storeEmbedding(content: string, metadata: EmbeddingMetadata): Promise<string>;
  searchSimilar(query: string, limit: number): Promise<SimilarityResult[]>;
  updateEmbedding(
    id: string,
    metadata: Partial<EmbeddingMetadata>,
  ): Promise<void>;
  deleteEmbedding(id: string): Promise<void>;
}

export interface IEpisodicMemory {
  // Complete task episodes
  storeEpisode(episode: Episode): Promise<void>;
  findSimilarEpisodes(task: any, limit: number): Promise<Episode[]>;
  getSuccessfulEpisodes(taskType?: string): Promise<Episode[]>;
  analyzeEpisodePatterns(): Promise<EpisodePattern[]>;
}

// Data structures - AgentContext is imported from agents module

export interface Interaction {
  id: string;
  agentId: string;
  type: 'input' | 'output' | 'decision' | 'error';
  content: string;
  metadata?: any;
  timestamp: Date;
}

export interface TaskMemory {
  taskId: string;
  title: string;
  description: string;
  agentId: string;
  plan: any;
  result: any;
  success: boolean;
  tokensUsed: number;
  duration: number;
  timestamp: Date;
  patterns?: string[];
}

export interface LearnedPattern {
  id: string;
  type:
    | 'task_decomposition'
    | 'error_resolution'
    | 'optimization'
    | 'code_generation';
  pattern: string;
  description: string;
  examples: string[];
  successRate: number;
  usageCount: number;
  createdAt: Date;
  lastUsed: Date;
}

export interface CodeSnippet {
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

export interface EmbeddingMetadata {
  type: 'task' | 'code' | 'pattern' | 'error' | 'solution' | 'episode';
  source: string;
  agentId?: string;
  taskId?: string;
  tags?: string[];
  timestamp: Date;
}

export interface SimilarityResult {
  id: string;
  content: string;
  similarity: number;
  metadata: EmbeddingMetadata;
}

export interface Episode {
  id: string;
  taskId: string;
  agentId: string;
  taskType: string;
  startTime: Date;
  endTime: Date;
  success: boolean;
  steps: EpisodeStep[];
  decisions: any[]; // Decision type is in agent interface
  outcome: any;
  learnings?: string[];
}

export interface EpisodeStep {
  order: number;
  action: string;
  input: any;
  output: any;
  duration: number;
  success: boolean;
}

export interface EpisodePattern {
  pattern: string;
  frequency: number;
  successRate: number;
  averageDuration: number;
  commonalities: string[];
}

export interface TaskFilter {
  agentId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  taskType?: string;
  limit?: number;
}

export interface MemoryStats {
  shortTerm: {
    activeContexts: number;
    recentInteractions: number;
    memoryUsage: number;
  };
  longTerm: {
    totalTasks: number;
    patterns: number;
    codeSnippets: number;
  };
  semantic: {
    totalEmbeddings: number;
    vectorDimensions: number;
  };
  episodic: {
    totalEpisodes: number;
    successRate: number;
  };
}
