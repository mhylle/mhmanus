import { Server, Socket } from 'socket.io';
export declare class TaskGateway {
    server: Server;
    private readonly logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribeToTasks(data: any, client: Socket): {
        event: string;
        data: string;
    };
    handleUnsubscribeFromTasks(data: any, client: Socket): {
        event: string;
        data: string;
    };
    emitTaskUpdate(task: any): void;
    emitTaskProgress(taskId: string, progress: number, message?: string): void;
}
