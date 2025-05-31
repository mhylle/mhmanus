# Phase 8: Learning & Adaptation

## Overview

Phase 8 implements a comprehensive learning and adaptation system that enables agents to improve their performance over time by recognizing patterns, collecting metrics, and adapting their strategies based on past experiences.

## Architecture

### Components

1. **Metrics Collector Service**
   - Tracks execution metrics for each agent task
   - Records tool usage, execution time, memory consumption
   - Stores metrics in PostgreSQL for analysis

2. **Pattern Recognition Service**
   - Analyzes successful task executions
   - Identifies recurring patterns in tool usage
   - Creates reusable execution patterns

3. **Adaptation Service**
   - Manages adaptation strategies for agents
   - Applies learned patterns to new tasks
   - Evaluates strategy effectiveness

4. **Learning Service**
   - Orchestrates the learning process
   - Provides insights and performance comparisons
   - Manages learning configuration

### Data Flow

```
Agent Execution → Metrics Collection → Pattern Recognition → Strategy Creation → Agent Adaptation
```

## Key Features

### 1. Execution Metrics Collection

```typescript
export interface ExecutionMetrics {
  agentId: string;
  taskId: string;
  executionTime: number;
  memoryUsage: number;
  toolsUsed: ToolUsageMetric[];
  success: boolean;
  errorCount: number;
  outputQuality?: number;
}
```

### 2. Pattern Recognition

The system automatically identifies patterns when:
- A sequence of tools is used successfully multiple times
- The pattern occurs at least 3 times (configurable)
- Success rate exceeds 70%

### 3. Adaptation Strategies

Strategies define how agents should adapt based on conditions:

```typescript
export interface AdaptationStrategy {
  conditions: StrategyCondition[];  // When to apply
  actions: StrategyAction[];        // What to do
  priority: number;                 // Order of application
  successRate: number;              // Historical performance
}
```

### 4. Learning Insights

The system generates insights such as:
- Most frequently used tools
- Performance trends
- Optimization recommendations

## Integration with Agents

### BaseAgent Updates

The BaseAgent class now emits events during execution:
- `agent.execution.start` - When task processing begins
- `agent.tool.used` - When a tool is executed
- `agent.execution.complete` - When task finishes

### Agent Context

Agents can receive adaptations through their context:

```typescript
const adaptations = await learningService.getAdaptations(
  agentType,
  context
);

// Adaptations might include:
// - Preferred tools to use
// - Patterns to follow
// - Parameters to set
```

## API Endpoints

### Metrics
- `GET /learning/metrics/:agentId` - Get agent metrics
- `GET /learning/performance/:agentId` - Compare performance

### Patterns
- `GET /learning/patterns/:taskType` - Get relevant patterns

### Strategies
- `GET /learning/strategies/:agentType` - List strategies
- `POST /learning/strategies` - Create new strategy

### Insights
- `GET /learning/insights/:agentId` - Generate insights

## Configuration

```typescript
const learningConfig = {
  minPatternOccurrences: 3,      // Min times for pattern
  confidenceThreshold: 0.7,       // Min confidence to apply
  maxPatternAge: 30,              // Days before stale
  adaptationRate: 0.1,            // Learning rate
};
```

## Example Usage

### 1. Automatic Pattern Learning

When an agent successfully completes similar tasks:
1. Metrics are collected automatically
2. Pattern recognition identifies the sequence
3. A new pattern is stored for future use

### 2. Strategy Application

```typescript
// Create a strategy for code generation
POST /learning/strategies
{
  "agentType": "CODE",
  "taskType": "interface_generation",
  "conditions": [
    { "field": "taskType", "operator": "eq", "value": "interface_generation" }
  ],
  "actions": [
    { "type": "prefer_tool", "target": "typescript_analyzer" },
    { "type": "set_parameter", "target": "useStrict", "parameters": { "value": true } }
  ],
  "priority": 10
}
```

### 3. Performance Analysis

```typescript
GET /learning/performance/code-agent-001?taskType=code_generation

// Response shows improvement over time
{
  "beforeLearning": {
    "avgExecutionTime": 5000,
    "successRate": 0.7
  },
  "afterLearning": {
    "avgExecutionTime": 3000,
    "successRate": 0.9
  },
  "improvement": 40
}
```

## Database Schema

### learning_metrics
- Stores raw execution metrics
- Indexed by agentId, taskId, createdAt

### execution_patterns
- Stores recognized patterns
- Includes success rate and usage count

### agent_strategies
- Stores adaptation strategies
- Tracks application count and success rate

## Future Enhancements

1. **Reinforcement Learning**: Implement reward-based learning
2. **Cross-Agent Learning**: Share patterns between agents
3. **A/B Testing**: Test multiple strategies simultaneously
4. **Real-time Adaptation**: Adjust strategies during execution
5. **Pattern Visualization**: UI for viewing and managing patterns

## Testing

Generate test metrics:
```bash
curl -X POST http://localhost:3000/learning/test/generate-metrics
```

This creates sample data for testing the learning system without running actual agent tasks.