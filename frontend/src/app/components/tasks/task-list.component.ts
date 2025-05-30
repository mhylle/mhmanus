import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { TaskItemComponent } from './task-item.component';
import { TaskStatus } from '../../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskItemComponent],
  template: `
    <div class="task-list-container">
      <div class="list-header">
        <div class="task-stats">
          <div class="stat">
            <span class="label">Pending</span>
            <span class="value">{{ taskService.pendingTasks().length }}</span>
          </div>
          <div class="stat">
            <span class="label">Processing</span>
            <span class="value">{{ taskService.processingTasks().length }}</span>
          </div>
          <div class="stat">
            <span class="label">Completed</span>
            <span class="value">{{ taskService.completedTasks().length }}</span>
          </div>
          <div class="stat">
            <span class="label">Failed</span>
            <span class="value">{{ taskService.failedTasks().length }}</span>
          </div>
        </div>
        
        <div class="connection-status" [class.connected]="taskService.isConnected()">
          <span class="dot"></span>
          {{ taskService.isConnected() ? 'Connected' : 'Disconnected' }}
        </div>
      </div>

      <div class="filter-tabs">
        <button 
          *ngFor="let filter of filters" 
          [class.active]="activeFilter === filter.value"
          (click)="activeFilter = filter.value"
          class="filter-tab"
        >
          {{ filter.label }}
          <span class="count">({{ getTaskCount(filter.value) }})</span>
        </button>
      </div>

      <div class="tasks-wrapper">
        <div class="tasks-scroll">
          @if (filteredTasks().length === 0) {
            <div class="empty-state">
              <p>No tasks found</p>
              <p class="hint">Create a new task to get started</p>
            </div>
          } @else {
            @for (task of filteredTasks(); track task.id) {
              <app-task-item 
                [task]="task" 
                [progress]="taskService.getTaskProgress(task.id)"
                (retry)="onRetry($event)"
                (cancel)="onCancel($event)"
                (delete)="onDelete($event)"
              ></app-task-item>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .task-list-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #f5f5f5;
    }

    .list-header {
      padding: 1.5rem 2rem;
      background-color: white;
      border-bottom: 1px solid #e9ecef;
      flex-shrink: 0;
    }

    .task-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;

      .stat {
        background-color: #f8f9fa;
        padding: 0.75rem;
        border-radius: 8px;
        text-align: center;

        .label {
          display: block;
          font-size: 0.75rem;
          color: #6c757d;
          margin-bottom: 0.25rem;
        }

        .value {
          display: block;
          font-size: 1.5rem;
          font-weight: 600;
          color: #2c3e50;
        }
      }
    }

    .connection-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      background-color: #f8f9fa;
      border-radius: 20px;
      font-size: 0.75rem;
      color: #dc3545;

      &.connected {
        color: #28a745;
      }

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: currentColor;
      }
    }

    .filter-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0 2rem;
      background-color: white;
      border-bottom: 2px solid #e9ecef;
      flex-shrink: 0;

      .filter-tab {
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: #6c757d;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
        bottom: -2px;
        font-size: 0.875rem;

        &:hover {
          color: #495057;
        }

        &.active {
          color: #3498db;
          border-bottom-color: #3498db;
        }

        .count {
          font-size: 0.75rem;
          margin-left: 0.25rem;
          opacity: 0.8;
        }
      }
    }

    .tasks-wrapper {
      flex: 1;
      overflow: hidden;
      position: relative;
      min-height: 0;
    }

    .tasks-scroll {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1.5rem 2rem;
      
      /* Custom scrollbar - visible and modern */
      &::-webkit-scrollbar {
        width: 10px;
      }
      
      &::-webkit-scrollbar-track {
        background: #e9ecef;
        border-radius: 5px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #6c757d;
        border-radius: 5px;
        
        &:hover {
          background: #5a6268;
        }
      }
      
      /* Firefox */
      scrollbar-width: thin;
      scrollbar-color: #6c757d #e9ecef;
    }

    app-task-item {
      display: block;
      margin-bottom: 1rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #6c757d;

      p {
        margin: 0.5rem 0;
      }

      .hint {
        font-size: 0.875rem;
        opacity: 0.8;
      }
    }
  `]
})
export class TaskListComponent {
  activeFilter: string = 'all';
  
  filters = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: TaskStatus.PENDING },
    { label: 'Processing', value: TaskStatus.PROCESSING },
    { label: 'Completed', value: TaskStatus.COMPLETED },
    { label: 'Failed', value: TaskStatus.FAILED },
  ];

  constructor(public taskService: TaskService) {
    // Load tasks on component init
    this.taskService.loadTasks();
  }

  filteredTasks() {
    const tasks = this.taskService.tasks();
    if (this.activeFilter === 'all') {
      return tasks;
    }
    return tasks.filter(task => task.status === this.activeFilter);
  }

  getTaskCount(filter: string): number {
    if (filter === 'all') {
      return this.taskService.tasks().length;
    }
    return this.taskService.tasks().filter(t => t.status === filter).length;
  }

  onRetry(taskId: string) {
    this.taskService.retryTask(taskId).subscribe({
      next: () => console.log('Task retried'),
      error: (error) => console.error('Error retrying task:', error),
    });
  }

  onCancel(taskId: string) {
    this.taskService.cancelTask(taskId).subscribe({
      next: () => console.log('Task cancelled'),
      error: (error) => console.error('Error cancelling task:', error),
    });
  }

  onDelete(taskId: string) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(taskId).subscribe({
        next: () => {
          this.taskService.tasks.update(tasks => 
            tasks.filter(t => t.id !== taskId)
          );
        },
        error: (error) => console.error('Error deleting task:', error),
      });
    }
  }
}