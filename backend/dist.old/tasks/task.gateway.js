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
var TaskGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
let TaskGateway = TaskGateway_1 = class TaskGateway {
    server;
    logger = new common_1.Logger(TaskGateway_1.name);
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleSubscribeToTasks(data, client) {
        client.join('tasks');
        this.logger.log(`Client ${client.id} subscribed to tasks`);
        return {
            event: 'subscribed',
            data: 'Successfully subscribed to task updates',
        };
    }
    handleUnsubscribeFromTasks(data, client) {
        client.leave('tasks');
        this.logger.log(`Client ${client.id} unsubscribed from tasks`);
        return {
            event: 'unsubscribed',
            data: 'Successfully unsubscribed from task updates',
        };
    }
    emitTaskUpdate(task) {
        this.server.to('tasks').emit('taskUpdate', task);
        this.logger.debug(`Emitted task update for task: ${task.id}`);
    }
    emitTaskProgress(taskId, progress, message) {
        this.server.to('tasks').emit('taskProgress', {
            taskId,
            progress,
            message,
            timestamp: new Date(),
        });
    }
};
exports.TaskGateway = TaskGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TaskGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribeToTasks'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TaskGateway.prototype, "handleSubscribeToTasks", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribeFromTasks'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TaskGateway.prototype, "handleUnsubscribeFromTasks", null);
exports.TaskGateway = TaskGateway = TaskGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
            credentials: true,
        },
    })
], TaskGateway);
//# sourceMappingURL=task.gateway.js.map