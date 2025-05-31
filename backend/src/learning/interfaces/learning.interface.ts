export interface ExecutionMetrics {
  agentId: string;
  taskId: string;
  executionTime: number;
  memoryUsage: number;
  toolsUsed: ToolUsageMetric[];
  success: boolean;
  errorCount: number;
  outputQuality?: number; // 0-1 score
}

export interface ToolUsageMetric {
  toolName: string;
  category: string;
  executionTime: number;
  success: boolean;
  inputSize?: number;
  outputSize?: number;
  errorMessage?: string;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  taskType: string;
  sequence: PatternStep[];
  successRate: number;
  avgExecutionTime: number;
  usageCount: number;
  lastUsed: Date;
}

export interface PatternStep {
  order: number;
  action: string;
  toolName?: string;
  parameters?: Record<string, any>;
  expectedOutcome?: string;
}

export interface LearningInsight {
  patternId: string;
  insight: string;
  confidence: number; // 0-1
  recommendations: string[];
  createdAt: Date;
}

export interface AdaptationStrategy {
  id: string;
  agentType: string;
  taskType: string;
  conditions: StrategyCondition[];
  actions: StrategyAction[];
  priority: number;
  successRate: number;
  enabled: boolean;
}

export interface StrategyCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'regex';
  value: any;
}

export interface StrategyAction {
  type: 'use_pattern' | 'avoid_tool' | 'prefer_tool' | 'set_parameter' | 'delegate_to';
  target: string;
  parameters?: Record<string, any>;
}

export interface LearningConfig {
  minPatternOccurrences: number; // Minimum times a pattern must occur to be learned
  confidenceThreshold: number; // Minimum confidence to apply a pattern
  maxPatternAge: number; // Days before a pattern is considered stale
  adaptationRate: number; // How quickly to adapt (0-1)
}

export interface PerformanceComparison {
  agentId: string;
  taskType: string;
  beforeLearning: PerformanceMetrics;
  afterLearning: PerformanceMetrics;
  improvement: number; // Percentage
}

export interface PerformanceMetrics {
  avgExecutionTime: number;
  successRate: number;
  avgMemoryUsage: number;
  avgToolCalls: number;
  errorRate: number;
}