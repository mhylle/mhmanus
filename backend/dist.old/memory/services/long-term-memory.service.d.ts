import { Repository } from 'typeorm';
import { ILongTermMemory, TaskMemory, TaskFilter, LearnedPattern, CodeSnippet } from '../interfaces/memory.interface';
import { TaskMemoryEntity, LearnedPatternEntity, CodeSnippetEntity } from '../entities/task-memory.entity';
export declare class LongTermMemoryService implements ILongTermMemory {
    private taskMemoryRepo;
    private patternRepo;
    private codeSnippetRepo;
    private readonly logger;
    constructor(taskMemoryRepo: Repository<TaskMemoryEntity>, patternRepo: Repository<LearnedPatternEntity>, codeSnippetRepo: Repository<CodeSnippetEntity>);
    store(key: string, value: any): Promise<void>;
    retrieve(key: string): Promise<any | null>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    clear(): Promise<void>;
    storeTaskResult(taskId: string, result: TaskMemory): Promise<void>;
    getTaskHistory(filter?: TaskFilter): Promise<TaskMemory[]>;
    storePattern(pattern: LearnedPattern): Promise<void>;
    getPatterns(type?: string): Promise<LearnedPattern[]>;
    storeCodeSnippet(snippet: CodeSnippet): Promise<void>;
    searchCodeSnippets(query: string): Promise<CodeSnippet[]>;
    private extractAndStorePatterns;
    private mapTaskMemoryFromEntity;
    private mapPatternFromEntity;
    private mapCodeSnippetFromEntity;
    updatePatternUsage(patternId: string, success: boolean): Promise<void>;
    updateCodeSnippetUsage(snippetId: string, success: boolean): Promise<void>;
}
