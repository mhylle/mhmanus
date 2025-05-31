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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bull_1 = require("@nestjs/bull");
const task_entity_1 = require("./entities/task.entity");
const task_gateway_1 = require("./task.gateway");
let TasksService = TasksService_1 = class TasksService {
    taskRepository;
    taskQueue;
    taskGateway;
    logger = new common_1.Logger(TasksService_1.name);
    constructor(taskRepository, taskQueue, taskGateway) {
        this.taskRepository = taskRepository;
        this.taskQueue = taskQueue;
        this.taskGateway = taskGateway;
    }
    async create(createTaskDto) {
        const task = this.taskRepository.create(createTaskDto);
        const savedTask = await this.taskRepository.save(task);
        await this.addToQueue(savedTask);
        this.taskGateway.emitTaskUpdate(savedTask);
        this.logger.log(`Task created: ${savedTask.id} - ${savedTask.title}`);
        return savedTask;
    }
    async findAll() {
        return this.taskRepository.find({
            order: {
                createdAt: 'DESC',
            },
        });
    }
    async findOne(id) {
        const task = await this.taskRepository.findOne({ where: { id } });
        if (!task) {
            throw new common_1.NotFoundException(`Task with ID ${id} not found`);
        }
        return task;
    }
    async update(id, updateTaskDto) {
        const task = await this.findOne(id);
        Object.assign(task, updateTaskDto);
        const updatedTask = await this.taskRepository.save(task);
        this.taskGateway.emitTaskUpdate(updatedTask);
        return updatedTask;
    }
    async remove(id) {
        const task = await this.findOne(id);
        await this.taskRepository.remove(task);
        this.taskGateway.emitTaskUpdate({ id, status: task_entity_1.TaskStatus.CANCELLED });
    }
    async updateStatus(id, status) {
        const task = await this.findOne(id);
        task.status = status;
        if (status === task_entity_1.TaskStatus.PROCESSING && !task.startedAt) {
            task.startedAt = new Date();
        }
        if ([task_entity_1.TaskStatus.COMPLETED, task_entity_1.TaskStatus.FAILED].includes(status) &&
            !task.completedAt) {
            task.completedAt = new Date();
            if (task.startedAt) {
                task.actualDuration = Math.floor((task.completedAt.getTime() - task.startedAt.getTime()) / 1000);
            }
        }
        const updatedTask = await this.taskRepository.save(task);
        this.taskGateway.emitTaskUpdate(updatedTask);
        this.logger.log(`Task ${id} status updated to: ${status}`);
        return updatedTask;
    }
    async addToQueue(task) {
        const jobOptions = {
            priority: this.getPriorityValue(task.priority),
            attempts: task.maxRetries,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        };
        await this.taskQueue.add('process-task', { taskId: task.id }, jobOptions);
        await this.updateStatus(task.id, task_entity_1.TaskStatus.QUEUED);
    }
    getPriorityValue(priority) {
        const priorityMap = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4,
        };
        return priorityMap[priority] || 3;
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = TasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __param(1, (0, bull_1.InjectQueue)('tasks')),
    __metadata("design:paramtypes", [typeorm_2.Repository, Object, task_gateway_1.TaskGateway])
], TasksService);
//# sourceMappingURL=tasks.service.js.map