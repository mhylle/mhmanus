import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from '../../memory/memory.service';

export interface CodeQualityAnalysis {
  file: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: QualityIssue[];
  suggestions: string[];
  metrics: CodeMetrics;
  historicalComparison?: HistoricalComparison;
}

export interface QualityIssue {
  type:
    | 'complexity'
    | 'duplication'
    | 'naming'
    | 'structure'
    | 'security'
    | 'performance';
  severity: 'high' | 'medium' | 'low';
  line?: number;
  description: string;
  suggestion?: string;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  codeSmells: number;
  duplicateLines: number;
  testCoverage?: number;
  documentationCoverage: number;
}

export interface HistoricalComparison {
  previousScore?: number;
  scoreChange: number;
  trendsOverTime: Array<{ date: Date; score: number }>;
  commonIssues: string[];
  improvements: string[];
}

@Injectable()
export class CodeQualityService {
  private readonly logger = new Logger(CodeQualityService.name);
  private readonly qualityThresholds = {
    A: 90,
    B: 80,
    C: 70,
    D: 60,
    F: 0,
  };

  constructor(private readonly memoryService: MemoryService) {}

  async analyzeCode(
    code: string,
    filePath: string,
    language: string = 'typescript',
  ): Promise<CodeQualityAnalysis> {
    this.logger.log(`Analyzing code quality for ${filePath}`);

    // Calculate basic metrics
    const metrics = this.calculateMetrics(code);

    // Detect issues
    const issues = this.detectIssues(code, language);

    // Get historical data
    const historical = await this.getHistoricalData(filePath);

    // Generate suggestions based on memory
    const suggestions = await this.generateSuggestions(
      code,
      issues,
      historical,
    );

    // Calculate overall score
    const score = this.calculateScore(metrics, issues);
    const grade = this.getGrade(score);

    // Store analysis results
    await this.storeAnalysis(filePath, score, issues);

    return {
      file: filePath,
      score,
      grade,
      issues,
      suggestions,
      metrics,
      historicalComparison: historical,
    };
  }

  private calculateMetrics(code: string): CodeMetrics {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

    return {
      linesOfCode: nonEmptyLines.length,
      cyclomaticComplexity: this.calculateComplexity(code),
      maintainabilityIndex: this.calculateMaintainabilityIndex(code),
      codeSmells: this.detectCodeSmells(code),
      duplicateLines: this.detectDuplication(code),
      documentationCoverage: this.calculateDocumentationCoverage(code),
    };
  }

  private calculateComplexity(code: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\belse\b/g,
      /\bcase\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]+:/g, // Ternary operators
      /\&\&/g, // Logical AND
      /\|\|/g, // Logical OR
    ];

    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private calculateMaintainabilityIndex(code: string): number {
    // Simplified maintainability index calculation
    const loc = code.split('\n').length;
    const complexity = this.calculateComplexity(code);
    const comments = (code.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || []).length;

    // Halstead volume approximation
    const operators = (code.match(/[+\-*/%=<>!&|^~?:]/g) || []).length;
    const operands = (code.match(/\b\w+\b/g) || []).length;
    const volume = (operators + operands) * Math.log2(operators + operands);

    // MI = 171 - 5.2 * ln(V) - 0.23 * CC - 16.2 * ln(LOC)
    let mi = 171;
    mi -= 5.2 * Math.log(volume);
    mi -= 0.23 * complexity;
    mi -= 16.2 * Math.log(loc);

    // Bonus for comments
    mi += comments * 0.5;

    return Math.max(0, Math.min(100, mi));
  }

  private detectCodeSmells(code: string): number {
    let smells = 0;

    // Long methods (more than 50 lines)
    const methods =
      code.match(/(?:async\s+)?(?:function|\w+)\s*\([^)]*\)\s*{[^}]+}/g) || [];
    for (const method of methods) {
      if (method.split('\n').length > 50) {
        smells++;
      }
    }

    // Large classes (more than 500 lines)
    const classes = code.match(/class\s+\w+[^{]*{[\s\S]+?^}/gm) || [];
    for (const cls of classes) {
      if (cls.split('\n').length > 500) {
        smells++;
      }
    }

    // Too many parameters (more than 4)
    const params = code.match(/\([^)]+\)/g) || [];
    for (const param of params) {
      const count = param.split(',').length;
      if (count > 4) {
        smells++;
      }
    }

    // Duplicate code blocks
    smells += Math.floor(this.detectDuplication(code) / 10);

    // Magic numbers
    const magicNumbers =
      code.match(/[^a-zA-Z0-9_](\d{2,})[^a-zA-Z0-9_]/g) || [];
    smells += Math.min(magicNumbers.length, 5);

    return smells;
  }

  private detectDuplication(code: string): number {
    const lines = code
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 10);
    const duplicates = new Set<string>();
    const seen = new Map<string, number>();

    for (let i = 0; i < lines.length - 3; i++) {
      const block = lines.slice(i, i + 4).join('\n');
      if (seen.has(block)) {
        duplicates.add(block);
      } else {
        seen.set(block, i);
      }
    }

    return duplicates.size * 4; // 4 lines per duplicate block
  }

  private calculateDocumentationCoverage(code: string): number {
    const functions =
      code.match(/(?:async\s+)?(?:function|\w+)\s*\([^)]*\)/g) || [];
    const documented =
      code.match(
        /\/\*\*[\s\S]*?\*\/\s*(?:async\s+)?(?:function|\w+)\s*\([^)]*\)/g,
      ) || [];

    if (functions.length === 0) return 100;

    return Math.round((documented.length / functions.length) * 100);
  }

  private detectIssues(code: string, language: string): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Complexity issues
    const complexity = this.calculateComplexity(code);
    if (complexity > 20) {
      issues.push({
        type: 'complexity',
        severity: 'high',
        description: `High cyclomatic complexity: ${complexity}`,
        suggestion: 'Consider breaking this into smaller functions',
      });
    } else if (complexity > 10) {
      issues.push({
        type: 'complexity',
        severity: 'medium',
        description: `Moderate cyclomatic complexity: ${complexity}`,
        suggestion: 'Consider simplifying conditional logic',
      });
    }

    // Naming issues
    const poorNames = code.match(/\b[a-z]\b(?!\w)/g) || [];
    if (poorNames.length > 0) {
      issues.push({
        type: 'naming',
        severity: 'low',
        description: 'Single-letter variable names detected',
        suggestion: 'Use descriptive variable names',
      });
    }

    // Structure issues
    const deepNesting = this.detectDeepNesting(code);
    if (deepNesting > 4) {
      issues.push({
        type: 'structure',
        severity: 'medium',
        description: `Deep nesting detected (${deepNesting} levels)`,
        suggestion: 'Extract nested logic into separate functions',
      });
    }

    // Security issues
    if (language === 'typescript' || language === 'javascript') {
      if (code.includes('eval(')) {
        issues.push({
          type: 'security',
          severity: 'high',
          description: 'Use of eval() detected',
          suggestion: 'Avoid eval() - use safer alternatives',
        });
      }

      if (code.match(/password|secret|key/i) && code.match(/["'][^"']+["']/)) {
        issues.push({
          type: 'security',
          severity: 'high',
          description: 'Potential hardcoded secrets detected',
          suggestion: 'Use environment variables for sensitive data',
        });
      }
    }

    // Performance issues
    const inefficientLoops = code.match(/for.*in\s+|\.forEach\(/g) || [];
    if (inefficientLoops.length > 3) {
      issues.push({
        type: 'performance',
        severity: 'low',
        description: 'Multiple potentially inefficient loops',
        suggestion:
          'Consider using for...of or traditional for loops for better performance',
      });
    }

    return issues;
  }

  private detectDeepNesting(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  private async getHistoricalData(
    filePath: string,
  ): Promise<HistoricalComparison | undefined> {
    // Search for previous analyses of this file
    const historical = await this.memoryService.semantic.searchSimilar(
      `code quality analysis ${filePath}`,
      10,
    );

    if (historical.length === 0) {
      return undefined;
    }

    // Extract scores and trends
    const analyses = historical
      .filter(
        (h) =>
          h.metadata.type === 'code' &&
          h.metadata.source === 'quality_analysis',
      )
      .map((h) => ({
        date: h.metadata.timestamp,
        score: this.extractScoreFromContent(h.content),
      }))
      .filter((a) => a.score !== null);

    if (analyses.length === 0) {
      return undefined;
    }

    const previousScore = analyses[0]?.score || 0;
    const currentScore = 0; // Will be updated with actual score

    return {
      previousScore,
      scoreChange: currentScore - previousScore,
      trendsOverTime: analyses,
      commonIssues: this.extractCommonIssues(historical),
      improvements: [],
    };
  }

  private extractScoreFromContent(content: string): number {
    const match = content.match(/score:\s*(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private extractCommonIssues(historical: any[]): string[] {
    const issues = new Map<string, number>();

    for (const item of historical) {
      const issueMatches = item.content.match(/issue:\s*([^,]+)/g) || [];
      for (const match of issueMatches) {
        const issue = match.replace('issue:', '').trim();
        issues.set(issue, (issues.get(issue) || 0) + 1);
      }
    }

    return Array.from(issues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);
  }

  private async generateSuggestions(
    code: string,
    issues: QualityIssue[],
    historical?: HistoricalComparison,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Get successful patterns from memory
    const patterns =
      await this.memoryService.longTerm.getPatterns('code_generation');
    const highQualityPatterns = patterns.filter((p) => p.successRate > 90);

    // Basic suggestions based on issues
    for (const issue of issues) {
      if (issue.suggestion && !suggestions.includes(issue.suggestion)) {
        suggestions.push(issue.suggestion);
      }
    }

    // Suggestions based on successful patterns
    if (highQualityPatterns.length > 0) {
      suggestions.push(
        `Consider using proven patterns: ${highQualityPatterns[0].description}`,
      );
    }

    // Historical improvement suggestions
    if (historical && historical.commonIssues.length > 0) {
      suggestions.push(
        `Address recurring issues: ${historical.commonIssues[0]}`,
      );
    }

    // General suggestions based on metrics
    const complexity = this.calculateComplexity(code);
    if (complexity > 15) {
      suggestions.push(
        'Extract complex logic into well-named helper functions',
      );
    }

    const docCoverage = this.calculateDocumentationCoverage(code);
    if (docCoverage < 50) {
      suggestions.push(
        'Add JSDoc comments to public methods and complex functions',
      );
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  private calculateScore(metrics: CodeMetrics, issues: QualityIssue[]): number {
    let score = 100;

    // Deduct for complexity
    score -= Math.min(20, metrics.cyclomaticComplexity * 0.5);

    // Deduct for code smells
    score -= Math.min(15, metrics.codeSmells * 2);

    // Deduct for duplication
    score -= Math.min(10, metrics.duplicateLines * 0.2);

    // Deduct for issues
    for (const issue of issues) {
      switch (issue.severity) {
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }

    // Bonus for documentation
    score += Math.min(10, metrics.documentationCoverage * 0.1);

    // Bonus for maintainability
    score += Math.min(5, metrics.maintainabilityIndex * 0.05);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= this.qualityThresholds.A) return 'A';
    if (score >= this.qualityThresholds.B) return 'B';
    if (score >= this.qualityThresholds.C) return 'C';
    if (score >= this.qualityThresholds.D) return 'D';
    return 'F';
  }

  private async storeAnalysis(
    filePath: string,
    score: number,
    issues: QualityIssue[],
  ): Promise<void> {
    const analysisContent = `Code quality analysis for ${filePath}
score: ${score}
issues: ${issues.map((i) => `${i.type}:${i.severity}`).join(', ')}
timestamp: ${new Date().toISOString()}`;

    await this.memoryService.semantic.storeEmbedding(analysisContent, {
      type: 'code',
      source: 'quality_analysis',
      tags: ['quality', 'analysis', ...issues.map((i) => i.type)],
      timestamp: new Date(),
    });
  }

  async compareWithSimilarCode(
    code: string,
    language: string,
  ): Promise<{
    averageScore: number;
    betterThan: number;
    commonPatterns: string[];
    recommendations: string[];
  }> {
    // Find similar code in memory
    const similar = await this.memoryService.semantic.searchSimilar(
      `${language} code quality`,
      20,
    );

    const scores = similar
      .map((s) => this.extractScoreFromContent(s.content))
      .filter((s) => s > 0);

    const averageScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 70;

    const currentScore = 0; // Will be compared with actual score
    const betterThan =
      (scores.filter((s) => currentScore > s).length / scores.length) * 100;

    // Extract common patterns from high-quality code
    const highQualityCode = similar.filter(
      (s) => this.extractScoreFromContent(s.content) > 85,
    );

    const commonPatterns = this.extractPatterns(highQualityCode);
    const recommendations = this.generateRecommendations(commonPatterns);

    return {
      averageScore,
      betterThan,
      commonPatterns,
      recommendations,
    };
  }

  private extractPatterns(codeItems: any[]): string[] {
    const patterns = new Set<string>();

    for (const item of codeItems) {
      if (item.metadata.tags) {
        item.metadata.tags.forEach((tag) => patterns.add(tag));
      }
    }

    return Array.from(patterns).slice(0, 5);
  }

  private generateRecommendations(patterns: string[]): string[] {
    const recommendations: string[] = [];

    if (patterns.includes('async')) {
      recommendations.push(
        'Use async/await consistently for asynchronous operations',
      );
    }

    if (patterns.includes('types')) {
      recommendations.push('Ensure all functions have explicit return types');
    }

    if (patterns.includes('error-handling')) {
      recommendations.push(
        'Implement comprehensive error handling with custom error types',
      );
    }

    return recommendations;
  }
}
