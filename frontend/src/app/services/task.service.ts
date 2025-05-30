import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Task, CreateTaskDto, TaskProgress, TaskStatus } from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private apiUrl = 'http://localhost:3000/tasks';
  private socket!: Socket;
  
  // Signals for reactive state
  tasks = signal<Task[]>([]);
  taskProgress = signal<Map<string, TaskProgress>>(new Map());
  isConnected = signal(false);
  
  // Computed signals
  pendingTasks = computed(() => 
    this.tasks().filter(t => t.status === TaskStatus.PENDING)
  );
  
  processingTasks = computed(() => 
    this.tasks().filter(t => t.status === TaskStatus.PROCESSING)
  );
  
  completedTasks = computed(() => 
    this.tasks().filter(t => t.status === TaskStatus.COMPLETED)
  );
  
  failedTasks = computed(() => 
    this.tasks().filter(t => t.status === TaskStatus.FAILED)
  );

  constructor(private http: HttpClient) {
    this.initializeSocket();
    this.loadTasks();
  }

  private initializeSocket() {
    this.socket = io('http://localhost:3000', {
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
      this.isConnected.set(true);
      this.socket.emit('subscribeToTasks');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      this.isConnected.set(false);
    });

    this.socket.on('taskUpdate', (task: Task) => {
      console.log('Task update received:', task);
      this.updateTaskInList(task);
    });

    this.socket.on('taskProgress', (progress: TaskProgress) => {
      console.log('Task progress:', progress);
      const progressMap = new Map(this.taskProgress());
      progressMap.set(progress.taskId, progress);
      this.taskProgress.set(progressMap);
    });
  }

  private updateTaskInList(updatedTask: Task) {
    this.tasks.update(tasks => {
      const index = tasks.findIndex(t => t.id === updatedTask.id);
      if (index > -1) {
        const newTasks = [...tasks];
        newTasks[index] = updatedTask;
        return newTasks;
      }
      return [updatedTask, ...tasks];
    });
  }

  loadTasks() {
    this.getAllTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
      },
    });
  }

  createTask(taskData: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, taskData);
  }

  getAllTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl);
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/${id}`);
  }

  cancelTask(id: string): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/${id}/cancel`, {});
  }

  retryTask(id: string): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/${id}/retry`, {});
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getTaskProgress(taskId: string): TaskProgress | undefined {
    return this.taskProgress().get(taskId);
  }
}