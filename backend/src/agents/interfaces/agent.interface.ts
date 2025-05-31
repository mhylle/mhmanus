import { Task } from '../../tasks/entities/task.entity';

export interface AgentMetadata {
  id: string;
  name: string;
  type: AgentType;
  model: string;
  description: string;
  capabilities: string[];
  maxConcurrentTasks: number;
}

export enum AgentType {
  DIRECTOR = 'director',
  CODE = 'code',
  RESEARCH = 'research',
  QA = 'qa',
  GENERAL = 'general',
}

export interface AgentContext {
  taskId: string;
  sessionId: string;
  parentAgentId?: string;
  sharedMemory: Map<string, any>;
  trace: ExecutionTrace;
  decisions?: Decision[];
  workspace?: string;
}

export interface ExecutionTrace {
  spans: TraceSpan[];
  steps?: ExecutionStep[];
  startTime: Date;
  endTime?: Date;
}

export interface TraceSpan {
  spanId: string;
  parentSpanId?: string;
  agentId: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  attributes: Record<string, any>;
  events: TraceEvent[];
}

export interface TraceEvent {
  timestamp: Date;
  name: string;
  attributes?: Record<string, any>;
}

export interface Plan {
  steps: PlanStep[];
  estimatedDuration: number;
  requiredAgents: AgentType[];
  confidence: number;
}

export interface PlanStep {
  id: string;
  description: string;
  agentType: AgentType;
  dependencies: string[];
  expectedOutput: string;
  tools?: string[];
}

export interface AgentResult {
  success: boolean;
  output: any;
  reasoning: string;
  tokensUsed: number;
  duration: number;
  subResults?: AgentResult[];
  metadata?: any;
}

export interface IAgent {
  metadata: AgentMetadata;

  initialize(): Promise<void>;

  canHandle(task: Task): Promise<boolean>;

  plan(task: Task, context: AgentContext): Promise<Plan>;

  execute(plan: Plan, context: AgentContext): Promise<AgentResult>;

  validate(result: AgentResult): Promise<boolean>;
}

export interface IAgentCommunicationBus {
  send(message: AgentMessage): Promise<void>;

  subscribe(
    agentId: string,
    handler: (message: AgentMessage) => Promise<void>,
  ): void;

  unsubscribe(agentId: string): void;

  broadcast(message: AgentMessage): Promise<void>;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

export enum MessageType {
  TASK_REQUEST = 'task_request',
  TASK_RESPONSE = 'task_response',
  STATUS_UPDATE = 'status_update',
  RESOURCE_REQUEST = 'resource_request',
  RESOURCE_RESPONSE = 'resource_response',
  COORDINATION = 'coordination',
  ERROR = 'error',
}

export interface Decision {
  id?: string;
  agentId?: string;
  action?: string;
  description: string;
  options?: string[];
  chosen?: string;
  reasoning: string;
  confidence: number;
  timestamp: Date;
}

// Additional exports for code agent
export enum AgentCapability {
  TASK_PLANNING = 'task_planning',
  CODE_GENERATION = 'code_generation',
  TESTING = 'testing',
  RESEARCH = 'research',
  QUALITY_ASSURANCE = 'qa',
  PATTERN_LEARNING = 'pattern_learning',
}

export interface AgentPlan {
  agentId: string;
  taskId: string;
  steps: AgentStep[];
  estimatedTokens: number;
  confidence: number;
}

export interface AgentStep {
  action: string;
  description: string;
  input: any;
  dependencies: number[];
}

export interface ExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  tokensUsed: number;
  duration: number;
}

export interface ExecutionStep {
  agentId: string;
  action: string;
  input: any;
  output: any;
  duration: number;
  tokensUsed?: number;
  timestamp: Date;
}
