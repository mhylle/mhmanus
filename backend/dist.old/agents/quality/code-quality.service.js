"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CodeQualityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeQualityService = void 0;
const common_1 = require("@nestjs/common");
const memory_service_1 = require("../../memory/memory.service");
let CodeQualityService = CodeQualityService_1 = class CodeQualityService {
    memoryService;
    logger = new common_1.Logger(CodeQualityService_1.name);
    qualityThresholds = {
        A: 90,
        B: 80,
        C: 70,
        D: 60,
        F: 0,
    };
    constructor(memoryService) {
        this.memoryService = memoryService;
    }
    async analyzeCode(code, filePath, language = 'typescript') {
        this.logger.log(`Analyzing code quality for ${filePath}`);
        const metrics = this.calculateMetrics(code);
        const issues = this.detectIssues(code, language);
        const historical = await this.getHistoricalData(filePath);
        const suggestions = await this.generateSuggestions(code, issues, historical);
        const score = this.calculateScore(metrics, issues);
        const grade = this.getGrade(score);
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
    calculateMetrics(code) {
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
    calculateComplexity(code) {
        let complexity = 1;
        const patterns = [
            /\bif\b/g,
            /\belse\s+if\b/g,
            /\belse\b/g,
            /\bcase\b/g,
            /\bfor\b/g,
            /\bwhile\b/g,
            /\bcatch\b/g,
            /\?\s*[^:]+:/g,
            /\&\&/g,
            /\|\|/g,
        ];
        for (const pattern of patterns) {
            const matches = code.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }
        return complexity;
    }
    calculateMaintainabilityIndex(code) {
        const loc = code.split('\n').length;
        const complexity = this.calculateComplexity(code);
        const comments = (code.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || []).length;
        const operators = (code.match(/[+\-*/%=<>!&|^~?:]/g) || []).length;
        const operands = (code.match(/\b\w+\b/g) || []).length;
        const volume = (operators + operands) * Math.log2(operators + operands);
        let mi = 171;
        mi -= 5.2 * Math.log(volume);
        mi -= 0.23 * complexity;
        mi -= 16.2 * Math.log(loc);
        mi += comments * 0.5;
        return Math.max(0, Math.min(100, mi));
    }
    detectCodeSmells(code) {
        let smells = 0;
        const methods = code.match(/(?:async\s+)?(?:function|\w+)\s*\([^)]*\)\s*{[^}]+}/g) || [];
        for (const method of methods) {
            if (method.split('\n').length > 50) {
                smells++;
            }
        }
        const classes = code.match(/class\s+\w+[^{]*{[\s\S]+?^}/gm) || [];
        for (const cls of classes) {
            if (cls.split('\n').length > 500) {
                smells++;
            }
        }
        const params = code.match(/\([^)]+\)/g) || [];
        for (const param of params) {
            const count = param.split(',').length;
            if (count > 4) {
                smells++;
            }
        }
        smells += Math.floor(this.detectDuplication(code) / 10);
        const magicNumbers = code.match(/[^a-zA-Z0-9_](\d{2,})[^a-zA-Z0-9_]/g) || [];
        smells += Math.min(magicNumbers.length, 5);
        return smells;
    }
    detectDuplication(code) {
        const lines = code
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 10);
        const duplicates = new Set();
        const seen = new Map();
        for (let i = 0; i < lines.length - 3; i++) {
            const block = lines.slice(i, i + 4).join('\n');
            if (seen.has(block)) {
                duplicates.add(block);
            }
            else {
                seen.set(block, i);
            }
        }
        return duplicates.size * 4;
    }
    calculateDocumentationCoverage(code) {
        const functions = code.match(/(?:async\s+)?(?:function|\w+)\s*\([^)]*\)/g) || [];
        const documented = code.match(/\/\*\*[\s\S]*?\*\/\s*(?:async\s+)?(?:function|\w+)\s*\([^)]*\)/g) || [];
        if (functions.length === 0)
            return 100;
        return Math.round((documented.length / functions.length) * 100);
    }
    detectIssues(code, language) {
        const issues = [];
        const complexity = this.calculateComplexity(code);
        if (complexity > 20) {
            issues.push({
                type: 'complexity',
                severity: 'high',
                description: `High cyclomatic complexity: ${complexity}`,
                suggestion: 'Consider breaking this into smaller functions',
            });
        }
        else if (complexity > 10) {
            issues.push({
                type: 'complexity',
                severity: 'medium',
                description: `Moderate cyclomatic complexity: ${complexity}`,
                suggestion: 'Consider simplifying conditional logic',
            });
        }
        const poorNames = code.match(/\b[a-z]\b(?!\w)/g) || [];
        if (poorNames.length > 0) {
            issues.push({
                type: 'naming',
                severity: 'low',
                description: 'Single-letter variable names detected',
                suggestion: 'Use descriptive variable names',
            });
        }
        const deepNesting = this.detectDeepNesting(code);
        if (deepNesting > 4) {
            issues.push({
                type: 'structure',
                severity: 'medium',
                description: `Deep nesting detected (${deepNesting} levels)`,
                suggestion: 'Extract nested logic into separate functions',
            });
        }
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
        const inefficientLoops = code.match(/for.*in\s+|\.forEach\(/g) || [];
        if (inefficientLoops.length > 3) {
            issues.push({
                type: 'performance',
                severity: 'low',
                description: 'Multiple potentially inefficient loops',
                suggestion: 'Consider using for...of or traditional for loops for better performance',
            });
        }
        return issues;
    }
    detectDeepNesting(code) {
        let maxDepth = 0;
        let currentDepth = 0;
        for (const char of code) {
            if (char === '{') {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
            }
            else if (char === '}') {
                currentDepth = Math.max(0, currentDepth - 1);
            }
        }
        return maxDepth;
    }
    async getHistoricalData(filePath) {
        const historical = await this.memoryService.semantic.searchSimilar(`code quality analysis ${filePath}`, 10);
        if (historical.length === 0) {
            return undefined;
        }
        const analyses = historical
            .filter((h) => h.metadata.type === 'code' &&
            h.metadata.source === 'quality_analysis')
            .map((h) => ({
            date: h.metadata.timestamp,
            score: this.extractScoreFromContent(h.content),
        }))
            .filter((a) => a.score !== null);
        if (analyses.length === 0) {
            return undefined;
        }
        const previousScore = analyses[0]?.score || 0;
        const currentScore = 0;
        return {
            previousScore,
            scoreChange: currentScore - previousScore,
            trendsOverTime: analyses,
            commonIssues: this.extractCommonIssues(historical),
            improvements: [],
        };
    }
    extractScoreFromContent(content) {
        const match = content.match(/score:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }
    extractCommonIssues(historical) {
        const issues = new Map();
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
    async generateSuggestions(code, issues, historical) {
        const suggestions = [];
        const patterns = await this.memoryService.longTerm.getPatterns('code_generation');
        const highQualityPatterns = patterns.filter((p) => p.successRate > 90);
        for (const issue of issues) {
            if (issue.suggestion && !suggestions.includes(issue.suggestion)) {
                suggestions.push(issue.suggestion);
            }
        }
        if (highQualityPatterns.length > 0) {
            suggestions.push(`Consider using proven patterns: ${highQualityPatterns[0].description}`);
        }
        if (historical && historical.commonIssues.length > 0) {
            suggestions.push(`Address recurring issues: ${historical.commonIssues[0]}`);
        }
        const complexity = this.calculateComplexity(code);
        if (complexity > 15) {
            suggestions.push('Extract complex logic into well-named helper functions');
        }
        const docCoverage = this.calculateDocumentationCoverage(code);
        if (docCoverage < 50) {
            suggestions.push('Add JSDoc comments to public methods and complex functions');
        }
        return suggestions.slice(0, 5);
    }
    calculateScore(metrics, issues) {
        let score = 100;
        score -= Math.min(20, metrics.cyclomaticComplexity * 0.5);
        score -= Math.min(15, metrics.codeSmells * 2);
        score -= Math.min(10, metrics.duplicateLines * 0.2);
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
        score += Math.min(10, metrics.documentationCoverage * 0.1);
        score += Math.min(5, metrics.maintainabilityIndex * 0.05);
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    getGrade(score) {
        if (score >= this.qualityThresholds.A)
            return 'A';
        if (score >= this.qualityThresholds.B)
            return 'B';
        if (score >= this.qualityThresholds.C)
            return 'C';
        if (score >= this.qualityThresholds.D)
            return 'D';
        return 'F';
    }
    async storeAnalysis(filePath, score, issues) {
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
    async compareWithSimilarCode(code, language) {
        const similar = await this.memoryService.semantic.searchSimilar(`${language} code quality`, 20);
        const scores = similar
            .map((s) => this.extractScoreFromContent(s.content))
            .filter((s) => s > 0);
        const averageScore = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 70;
        const currentScore = 0;
        const betterThan = (scores.filter((s) => currentScore > s).length / scores.length) * 100;
        const highQualityCode = similar.filter((s) => this.extractScoreFromContent(s.content) > 85);
        const commonPatterns = this.extractPatterns(highQualityCode);
        const recommendations = this.generateRecommendations(commonPatterns);
        return {
            averageScore,
            betterThan,
            commonPatterns,
            recommendations,
        };
    }
    extractPatterns(codeItems) {
        const patterns = new Set();
        for (const item of codeItems) {
            if (item.metadata.tags) {
                item.metadata.tags.forEach((tag) => patterns.add(tag));
            }
        }
        return Array.from(patterns).slice(0, 5);
    }
    generateRecommendations(patterns) {
        const recommendations = [];
        if (patterns.includes('async')) {
            recommendations.push('Use async/await consistently for asynchronous operations');
        }
        if (patterns.includes('types')) {
            recommendations.push('Ensure all functions have explicit return types');
        }
        if (patterns.includes('error-handling')) {
            recommendations.push('Implement comprehensive error handling with custom error types');
        }
        return recommendations;
    }
};
exports.CodeQualityService = CodeQualityService;
exports.CodeQualityService = CodeQualityService = CodeQualityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [memory_service_1.MemoryService])
], CodeQualityService);
//# sourceMappingURL=code-quality.service.js.map