import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskGateway } from './task.gateway';
export declare class TasksService {
    private taskRepository;
    private taskQueue;
    private taskGateway;
    private readonly logger;
    constructor(taskRepository: Repository<Task>, taskQueue: Queue, taskGateway: TaskGateway);
    create(createTaskDto: CreateTaskDto): Promise<Task>;
    findAll(): Promise<Task[]>;
    findOne(id: string): Promise<Task>;
    update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task>;
    remove(id: string): Promise<void>;
    updateStatus(id: string, status: TaskStatus): Promise<Task>;
    private addToQueue;
    private getPriorityValue;
}
