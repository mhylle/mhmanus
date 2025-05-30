import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Task, TaskStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskGateway } from './task.gateway';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectQueue('tasks')
    private taskQueue: Queue,
    private taskGateway: TaskGateway,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create(createTaskDto);
    const savedTask = await this.taskRepository.save(task);

    // Add to queue for processing
    await this.addToQueue(savedTask);

    // Emit creation event
    this.taskGateway.emitTaskUpdate(savedTask);

    this.logger.log(`Task created: ${savedTask.id} - ${savedTask.title}`);
    return savedTask;
  }

  async findAll(): Promise<Task[]> {
    return this.taskRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);
    Object.assign(task, updateTaskDto);
    const updatedTask = await this.taskRepository.save(task);

    // Emit update event
    this.taskGateway.emitTaskUpdate(updatedTask);

    return updatedTask;
  }

  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.taskRepository.remove(task);

    // Emit deletion event
    this.taskGateway.emitTaskUpdate({ id, status: TaskStatus.CANCELLED });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const task = await this.findOne(id);
    task.status = status;

    if (status === TaskStatus.PROCESSING && !task.startedAt) {
      task.startedAt = new Date();
    }

    if (
      [TaskStatus.COMPLETED, TaskStatus.FAILED].includes(status) &&
      !task.completedAt
    ) {
      task.completedAt = new Date();
      if (task.startedAt) {
        task.actualDuration = Math.floor(
          (task.completedAt.getTime() - task.startedAt.getTime()) / 1000,
        );
      }
    }

    const updatedTask = await this.taskRepository.save(task);

    // Emit status update
    this.taskGateway.emitTaskUpdate(updatedTask);

    this.logger.log(`Task ${id} status updated to: ${status}`);
    return updatedTask;
  }

  private async addToQueue(task: Task): Promise<void> {
    const jobOptions = {
      priority: this.getPriorityValue(task.priority),
      attempts: task.maxRetries,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    await this.taskQueue.add('process-task', { taskId: task.id }, jobOptions);
    await this.updateStatus(task.id, TaskStatus.QUEUED);
  }

  private getPriorityValue(priority: string): number {
    const priorityMap = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };
    return priorityMap[priority] || 3;
  }
}
