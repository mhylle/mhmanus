import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentStrategy } from '../entities/agent-strategy.entity';
import { ExecutionPattern } from '../entities/execution-pattern.entity';
import { 
  AdaptationStrategy, 
  StrategyAction, 
  StrategyCondition,
  Pattern,
} from '../interfaces/learning.interface';
import { AgentContext, AgentType } from '../../agents/interfaces/agent.interface';

@Injectable()
export class AdaptationService {
  private readonly logger = new Logger(AdaptationService.name);

  constructor(
    @InjectRepository(AgentStrategy)
    private readonly strategyRepository: Repository<AgentStrategy>,
    @InjectRepository(ExecutionPattern)
    private readonly patternRepository: Repository<ExecutionPattern>,
  ) {}

  async getAdaptationStrategies(
    agentType: string,
    context: AgentContext,
  ): Promise<AdaptationStrategy[]> {
    // Get all enabled strategies for this agent type
    const strategies = await this.strategyRepository.find({
      where: { 
        agentType,
        enabled: true,
      },
      order: { priority: 'DESC' },
    });

    // Filter strategies based on conditions
    return strategies.filter(strategy => 
      this.evaluateConditions(strategy.conditions, context)
    );
  }

  private evaluateConditions(
    conditions: StrategyCondition[],
    context: AgentContext,
  ): boolean {
    for (const condition of conditions) {
      const value = this.getContextValue(context, condition.field);
      
      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }
    return true;
  }

  private getContextValue(context: AgentContext, field: string): any {
    const parts = field.split('.');
    let value: any = context;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private evaluateCondition(condition: StrategyCondition, value: any): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'regex':
        return new RegExp(condition.value).test(String(value));
      default:
        return false;
    }
  }

  async applyStrategy(
    strategy: AdaptationStrategy,
    context: AgentContext,
  ): Promise<Record<string, any>> {
    const adaptations: Record<string, any> = {};

    for (const action of strategy.actions) {
      const result = await this.executeAction(action, context);
      if (result) {
        Object.assign(adaptations, result);
      }
    }

    // Update strategy application count
    await this.strategyRepository.increment(
      { id: strategy.id },
      'applicationCount',
      1,
    );

    this.logger.debug(`Applied strategy ${strategy.id} with adaptations:`, adaptations);
    return adaptations;
  }

  private async executeAction(
    action: StrategyAction,
    context: AgentContext,
  ): Promise<Record<string, any> | null> {
    switch (action.type) {
      case 'use_pattern':
        return this.usePattern(action.target);
      
      case 'avoid_tool':
        return { avoidTools: [action.target] };
      
      case 'prefer_tool':
        return { preferredTools: [action.target] };
      
      case 'set_parameter':
        return { [action.target]: action.parameters?.value };
      
      case 'delegate_to':
        return { delegateToAgent: action.target };
      
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
        return null;
    }
  }

  private async usePattern(patternId: string): Promise<Record<string, any>> {
    const pattern = await this.patternRepository.findOne({
      where: { id: patternId },
    });

    if (!pattern) {
      this.logger.warn(`Pattern not found: ${patternId}`);
      return {};
    }

    return {
      usePattern: pattern,
      patternSteps: pattern.sequence,
    };
  }

  async createStrategy(
    agentType: string,
    taskType: string,
    conditions: StrategyCondition[],
    actions: StrategyAction[],
    priority: number = 0,
  ): Promise<AdaptationStrategy> {
    const strategy = this.strategyRepository.create({
      agentType,
      taskType,
      conditions,
      actions,
      priority,
      successRate: 0,
      enabled: true,
    });

    return this.strategyRepository.save(strategy);
  }

  async updateStrategySuccess(
    strategyId: string,
    success: boolean,
  ): Promise<void> {
    const strategy = await this.strategyRepository.findOne({
      where: { id: strategyId },
    });

    if (!strategy) {
      return;
    }

    // Update success rate using exponential moving average
    const alpha = 0.1; // Learning rate
    const currentSuccess = success ? 1 : 0;
    strategy.successRate = 
      alpha * currentSuccess + (1 - alpha) * strategy.successRate;

    // Disable strategy if success rate is too low
    if (strategy.applicationCount > 10 && strategy.successRate < 0.3) {
      strategy.enabled = false;
      this.logger.warn(`Disabled strategy ${strategyId} due to low success rate`);
    }

    await this.strategyRepository.save(strategy);
  }

  async learnFromPattern(
    pattern: Pattern,
    agentType: AgentType,
  ): Promise<AdaptationStrategy> {
    // Create a strategy that uses this pattern
    const conditions: StrategyCondition[] = [
      {
        field: 'taskType',
        operator: 'eq',
        value: pattern.taskType,
      },
    ];

    const actions: StrategyAction[] = [
      {
        type: 'use_pattern',
        target: pattern.id,
      },
    ];

    // Higher priority for patterns with better success rates
    const priority = Math.floor(pattern.successRate * 100);

    return this.createStrategy(
      agentType,
      pattern.taskType,
      conditions,
      actions,
      priority,
    );
  }

  async getStrategyPerformance(
    agentType: string,
    limit: number = 10,
  ): Promise<Array<{
    strategy: AdaptationStrategy;
    performance: {
      successRate: number;
      applicationCount: number;
      lastApplied?: Date;
    };
  }>> {
    const strategies = await this.strategyRepository.find({
      where: { agentType },
      order: { successRate: 'DESC' },
      take: limit,
    });

    return strategies.map(strategy => ({
      strategy,
      performance: {
        successRate: strategy.successRate,
        applicationCount: strategy.applicationCount,
        lastApplied: strategy.updatedAt,
      },
    }));
  }
}