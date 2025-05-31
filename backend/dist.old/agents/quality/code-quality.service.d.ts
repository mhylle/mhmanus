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
    type: 'complexity' | 'duplication' | 'naming' | 'structure' | 'security' | 'performance';
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
    trendsOverTime: Array<{
        date: Date;
        score: number;
    }>;
    commonIssues: string[];
    improvements: string[];
}
export declare class CodeQualityService {
    private readonly memoryService;
    private readonly logger;
    private readonly qualityThresholds;
    constructor(memoryService: MemoryService);
    analyzeCode(code: string, filePath: string, language?: string): Promise<CodeQualityAnalysis>;
    private calculateMetrics;
    private calculateComplexity;
    private calculateMaintainabilityIndex;
    private detectCodeSmells;
    private detectDuplication;
    private calculateDocumentationCoverage;
    private detectIssues;
    private detectDeepNesting;
    private getHistoricalData;
    private extractScoreFromContent;
    private extractCommonIssues;
    private generateSuggestions;
    private calculateScore;
    private getGrade;
    private storeAnalysis;
    compareWithSimilarCode(code: string, language: string): Promise<{
        averageScore: number;
        betterThan: number;
        commonPatterns: string[];
        recommendations: string[];
    }>;
    private extractPatterns;
    private generateRecommendations;
}
