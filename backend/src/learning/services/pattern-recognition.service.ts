import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { ExecutionPattern } from '../entities/execution-pattern.entity';
import { LearningMetric } from '../entities/learning-metric.entity';
import { Pattern, PatternStep, ToolUsageMetric } from '../interfaces/learning.interface';

interface PatternCandidate {
  sequence: PatternStep[];
  occurrences: number;
  avgExecutionTime: number;
  successRate: number;
}

@Injectable()
export class PatternRecognitionService {
  private readonly logger = new Logger(PatternRecognitionService.name);
  private readonly MIN_PATTERN_LENGTH = 2;
  private readonly MIN_OCCURRENCES = 3;
  private readonly SIMILARITY_THRESHOLD = 0.8;

  constructor(
    @InjectRepository(ExecutionPattern)
    private readonly patternRepository: Repository<ExecutionPattern>,
    @InjectRepository(LearningMetric)
    private readonly metricsRepository: Repository<LearningMetric>,
  ) {}

  @OnEvent('metrics.collected')
  async analyzeNewMetrics(metric: LearningMetric): Promise<void> {
    if (!metric.success || metric.toolsUsed.length < this.MIN_PATTERN_LENGTH) {
      return;
    }

    // Get recent successful executions for pattern analysis
    const recentMetrics = await this.getRecentSuccessfulMetrics(
      metric.agentId,
      metric.context?.taskType,
    );

    // Find pattern candidates
    const candidates = this.findPatternCandidates(recentMetrics);

    // Save or update patterns
    for (const candidate of candidates) {
      if (candidate.occurrences >= this.MIN_OCCURRENCES) {
        await this.saveOrUpdatePattern(candidate, metric.context?.taskType);
      }
    }
  }

  private async getRecentSuccessfulMetrics(
    agentId: string,
    taskType?: string,
    limit: number = 50,
  ): Promise<LearningMetric[]> {
    const query = this.metricsRepository
      .createQueryBuilder('metric')
      .where('metric.agentId = :agentId', { agentId })
      .andWhere('metric.success = true')
      .andWhere('jsonb_array_length(metric.toolsUsed) >= :minLength', {
        minLength: this.MIN_PATTERN_LENGTH,
      });

    if (taskType) {
      query.andWhere('metric.context->>\'taskType\' = :taskType', { taskType });
    }

    return query
      .orderBy('metric.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  private findPatternCandidates(metrics: LearningMetric[]): PatternCandidate[] {
    const candidates: Map<string, PatternCandidate> = new Map();

    // Extract tool sequences from metrics
    for (let i = 0; i < metrics.length; i++) {
      const sequence = this.extractPatternSequence(metrics[i].toolsUsed);
      
      // Look for this sequence in other metrics
      const matches = metrics.filter((m, j) => 
        i !== j && this.sequencesMatch(sequence, this.extractPatternSequence(m.toolsUsed))
      );

      if (matches.length >= this.MIN_OCCURRENCES - 1) {
        const key = this.sequenceToKey(sequence);
        const allMatches = [metrics[i], ...matches];
        
        candidates.set(key, {
          sequence,
          occurrences: allMatches.length,
          avgExecutionTime: this.calculateAverage(allMatches.map(m => m.executionTime)),
          successRate: 1.0, // All are successful
        });
      }
    }

    return Array.from(candidates.values());
  }

  private extractPatternSequence(tools: ToolUsageMetric[]): PatternStep[] {
    return tools.map((tool, index) => ({
      order: index,
      action: this.categorizeAction(tool),
      toolName: tool.toolName,
      parameters: this.extractKeyParameters(tool),
    }));
  }

  private categorizeAction(tool: ToolUsageMetric): string {
    // Categorize based on tool name and category
    if (tool.category === 'file' && tool.toolName.includes('read')) {
      return 'read_file';
    }
    if (tool.category === 'file' && tool.toolName.includes('write')) {
      return 'write_file';
    }
    if (tool.category === 'search') {
      return 'search';
    }
    if (tool.category === 'database') {
      return 'database_query';
    }
    return tool.toolName;
  }

  private extractKeyParameters(tool: ToolUsageMetric): Record<string, any> {
    // Extract only key parameters that define the pattern
    const params: Record<string, any> = {};
    
    if (tool.inputSize) {
      params.inputSizeRange = this.categorizeSize(tool.inputSize);
    }
    
    return params;
  }

  private categorizeSize(size: number): string {
    if (size < 1000) return 'small';
    if (size < 10000) return 'medium';
    return 'large';
  }

  private sequencesMatch(seq1: PatternStep[], seq2: PatternStep[]): boolean {
    if (seq1.length !== seq2.length) {
      return false;
    }

    let matchScore = 0;
    for (let i = 0; i < seq1.length; i++) {
      if (seq1[i].action === seq2[i].action) {
        matchScore += 1;
      } else if (seq1[i].toolName === seq2[i].toolName) {
        matchScore += 0.5;
      }
    }

    return (matchScore / seq1.length) >= this.SIMILARITY_THRESHOLD;
  }

  private sequenceToKey(sequence: PatternStep[]): string {
    return sequence.map(s => s.action).join('-');
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private async saveOrUpdatePattern(
    candidate: PatternCandidate,
    taskType?: string,
  ): Promise<void> {
    const name = this.generatePatternName(candidate.sequence);
    const description = this.generatePatternDescription(candidate.sequence);

    // Check if pattern already exists
    const existing = await this.patternRepository.findOne({
      where: { name, taskType: taskType || 'general' },
    });

    if (existing) {
      // Update existing pattern
      existing.usageCount += candidate.occurrences;
      existing.avgExecutionTime = 
        (existing.avgExecutionTime * existing.usageCount + 
         candidate.avgExecutionTime * candidate.occurrences) / 
        (existing.usageCount + candidate.occurrences);
      existing.successRate = 
        (existing.successRate * existing.usageCount + 
         candidate.successRate * candidate.occurrences) / 
        (existing.usageCount + candidate.occurrences);
      existing.lastUsed = new Date();
      
      await this.patternRepository.save(existing);
      this.logger.log(`Updated pattern: ${name}`);
    } else {
      // Create new pattern
      const pattern = this.patternRepository.create({
        name,
        description,
        taskType: taskType || 'general',
        sequence: candidate.sequence,
        successRate: candidate.successRate,
        avgExecutionTime: candidate.avgExecutionTime,
        usageCount: candidate.occurrences,
        lastUsed: new Date(),
      });
      
      await this.patternRepository.save(pattern);
      this.logger.log(`Created new pattern: ${name}`);
    }
  }

  private generatePatternName(sequence: PatternStep[]): string {
    return sequence.map(s => s.action).join('_');
  }

  private generatePatternDescription(sequence: PatternStep[]): string {
    const actions = sequence.map(s => s.action);
    return `Pattern that ${actions.join(', then ')}`;
  }

  async getRelevantPatterns(
    taskType: string,
    minSuccessRate: number = 0.7,
  ): Promise<Pattern[]> {
    return this.patternRepository.find({
      where: [
        { taskType, successRate: minSuccessRate },
        { taskType: 'general', successRate: minSuccessRate },
      ],
      order: { successRate: 'DESC', usageCount: 'DESC' },
    });
  }

  async getPatternById(id: string): Promise<Pattern | null> {
    return this.patternRepository.findOne({ where: { id } });
  }
}