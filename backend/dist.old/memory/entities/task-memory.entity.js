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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodeEntity = exports.CodeSnippetEntity = exports.LearnedPatternEntity = exports.TaskMemoryEntity = void 0;
const typeorm_1 = require("typeorm");
let TaskMemoryEntity = class TaskMemoryEntity {
    id;
    taskId;
    title;
    description;
    agentId;
    plan;
    result;
    success;
    tokensUsed;
    duration;
    patterns;
    timestamp;
    updatedAt;
};
exports.TaskMemoryEntity = TaskMemoryEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaskMemoryEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaskMemoryEntity.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaskMemoryEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], TaskMemoryEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TaskMemoryEntity.prototype, "agentId", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], TaskMemoryEntity.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], TaskMemoryEntity.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Boolean)
], TaskMemoryEntity.prototype, "success", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], TaskMemoryEntity.prototype, "tokensUsed", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], TaskMemoryEntity.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, nullable: true }),
    __metadata("design:type", Array)
], TaskMemoryEntity.prototype, "patterns", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaskMemoryEntity.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TaskMemoryEntity.prototype, "updatedAt", void 0);
exports.TaskMemoryEntity = TaskMemoryEntity = __decorate([
    (0, typeorm_1.Entity)('task_memories'),
    (0, typeorm_1.Index)(['agentId', 'timestamp']),
    (0, typeorm_1.Index)(['success', 'timestamp'])
], TaskMemoryEntity);
let LearnedPatternEntity = class LearnedPatternEntity {
    id;
    type;
    pattern;
    description;
    examples;
    successRate;
    usageCount;
    createdAt;
    lastUsed;
};
exports.LearnedPatternEntity = LearnedPatternEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], LearnedPatternEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LearnedPatternEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], LearnedPatternEntity.prototype, "pattern", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], LearnedPatternEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true }),
    __metadata("design:type", Array)
], LearnedPatternEntity.prototype, "examples", void 0);
__decorate([
    (0, typeorm_1.Column)('float'),
    __metadata("design:type", Number)
], LearnedPatternEntity.prototype, "successRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], LearnedPatternEntity.prototype, "usageCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], LearnedPatternEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], LearnedPatternEntity.prototype, "lastUsed", void 0);
exports.LearnedPatternEntity = LearnedPatternEntity = __decorate([
    (0, typeorm_1.Entity)('learned_patterns'),
    (0, typeorm_1.Index)(['type', 'successRate'])
], LearnedPatternEntity);
let CodeSnippetEntity = class CodeSnippetEntity {
    id;
    language;
    purpose;
    code;
    tags;
    usageCount;
    successRate;
    createdAt;
    lastUsed;
};
exports.CodeSnippetEntity = CodeSnippetEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CodeSnippetEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CodeSnippetEntity.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CodeSnippetEntity.prototype, "purpose", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], CodeSnippetEntity.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true }),
    __metadata("design:type", Array)
], CodeSnippetEntity.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], CodeSnippetEntity.prototype, "usageCount", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { default: 0 }),
    __metadata("design:type", Number)
], CodeSnippetEntity.prototype, "successRate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CodeSnippetEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CodeSnippetEntity.prototype, "lastUsed", void 0);
exports.CodeSnippetEntity = CodeSnippetEntity = __decorate([
    (0, typeorm_1.Entity)('code_snippets'),
    (0, typeorm_1.Index)(['language', 'usageCount']),
    (0, typeorm_1.Index)(['tags'])
], CodeSnippetEntity);
let EpisodeEntity = class EpisodeEntity {
    id;
    taskId;
    agentId;
    taskType;
    startTime;
    endTime;
    success;
    steps;
    decisions;
    outcome;
    learnings;
    createdAt;
};
exports.EpisodeEntity = EpisodeEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], EpisodeEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EpisodeEntity.prototype, "taskId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EpisodeEntity.prototype, "agentId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EpisodeEntity.prototype, "taskType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], EpisodeEntity.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Date)
], EpisodeEntity.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Boolean)
], EpisodeEntity.prototype, "success", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Array)
], EpisodeEntity.prototype, "steps", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Array)
], EpisodeEntity.prototype, "decisions", void 0);
__decorate([
    (0, typeorm_1.Column)('jsonb'),
    __metadata("design:type", Object)
], EpisodeEntity.prototype, "outcome", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { array: true, nullable: true }),
    __metadata("design:type", Array)
], EpisodeEntity.prototype, "learnings", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], EpisodeEntity.prototype, "createdAt", void 0);
exports.EpisodeEntity = EpisodeEntity = __decorate([
    (0, typeorm_1.Entity)('episodes'),
    (0, typeorm_1.Index)(['taskId']),
    (0, typeorm_1.Index)(['agentId', 'success']),
    (0, typeorm_1.Index)(['taskType', 'success'])
], EpisodeEntity);
//# sourceMappingURL=task-memory.entity.js.map