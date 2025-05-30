import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    credentials: true,
  },
})
export class TaskGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TaskGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToTasks')
  handleSubscribeToTasks(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    client.join('tasks');
    this.logger.log(`Client ${client.id} subscribed to tasks`);
    return {
      event: 'subscribed',
      data: 'Successfully subscribed to task updates',
    };
  }

  @SubscribeMessage('unsubscribeFromTasks')
  handleUnsubscribeFromTasks(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave('tasks');
    this.logger.log(`Client ${client.id} unsubscribed from tasks`);
    return {
      event: 'unsubscribed',
      data: 'Successfully unsubscribed from task updates',
    };
  }

  emitTaskUpdate(task: any) {
    this.server.to('tasks').emit('taskUpdate', task);
    this.logger.debug(`Emitted task update for task: ${task.id}`);
  }

  emitTaskProgress(taskId: string, progress: number, message?: string) {
    this.server.to('tasks').emit('taskProgress', {
      taskId,
      progress,
      message,
      timestamp: new Date(),
    });
  }
}
