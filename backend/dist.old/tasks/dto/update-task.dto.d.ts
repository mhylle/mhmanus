import { CreateTaskDto } from './create-task.dto';
import { TaskStatus } from '../entities/task.entity';
declare const UpdateTaskDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateTaskDto>>;
export declare class UpdateTaskDto extends UpdateTaskDto_base {
    status?: TaskStatus;
    result?: Record<string, any> | null;
    error?: string | null;
    metadata?: Record<string, any>;
}
export {};
