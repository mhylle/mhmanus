import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, TaskProgress, TaskStatus } from '../../models/task.model';

@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-item" [class]="'status-' + task.status">
      <div class="task-header">
        <h4>{{ task.title }}</h4>
        <div class="task-meta">
          <span class="priority" [class]="'priority-' + task.priority">
            {{ task.priority }}
          </span>
          <span class="status">{{ getStatusLabel(task.status) }}</span>
        </div>
      </div>

      <p class="description">{{ task.description }}</p>

      @if (progress && task.status === TaskStatus.PROCESSING) {
        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progress.progress"></div>
          </div>
          <p class="progress-message">{{ progress.message }}</p>
        </div>
      }

      @if (task.result && task.status === TaskStatus.COMPLETED) {
        <div class="result-section">
          <h5>Result:</h5>
          <pre>{{ task.result['execution'] }}</pre>
        </div>
      }

      @if (task.error && task.status === TaskStatus.FAILED) {
        <div class="error-section">
          <h5>Error:</h5>
          <p>{{ task.error }}</p>
        </div>
      }

      <div class="task-footer">
        <div class="timestamps">
          <span>Created: {{ formatDate(task.createdAt) }}</span>
          @if (task.completedAt) {
            <span>Completed: {{ formatDate(task.completedAt) }}</span>
          }
          @if (task.actualDuration) {
            <span>Duration: {{ formatDuration(task.actualDuration) }}</span>
          }
        </div>

        <div class="actions">
          @if (task.status === TaskStatus.FAILED) {
            <button class="btn btn-retry" (click)="retry.emit(task.id)">
              Retry
            </button>
          }
          @if (task.status === TaskStatus.PROCESSING || task.status === TaskStatus.QUEUED) {
            <button class="btn btn-cancel" (click)="cancel.emit(task.id)">
              Cancel
            </button>
          }
          @if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED || task.status === TaskStatus.CANCELLED) {
            <button class="btn btn-delete" (click)="delete.emit(task.id)">
              Delete
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-item {
      background-color: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1.5rem;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      &.status-processing {
        border-left: 4px solid #3498db;
      }

      &.status-completed {
        border-left: 4px solid #28a745;
      }

      &.status-failed {
        border-left: 4px solid #dc3545;
      }

      &.status-queued {
        border-left: 4px solid #ffc107;
      }
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;

      h4 {
        margin: 0;
        color: #2c3e50;
        flex: 1;
      }
    }

    .task-meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .priority, .status {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .priority {
      background-color: #e9ecef;
      color: #495057;

      &.priority-critical {
        background-color: #dc3545;
        color: white;
      }

      &.priority-high {
        background-color: #fd7e14;
        color: white;
      }

      &.priority-medium {
        background-color: #ffc107;
        color: #212529;
      }

      &.priority-low {
        background-color: #28a745;
        color: white;
      }
    }

    .status {
      background-color: #e9ecef;
      color: #495057;
    }

    .description {
      color: #6c757d;
      margin-bottom: 1rem;
      line-height: 1.5;
    }

    .progress-section {
      margin: 1rem 0;

      .progress-bar {
        height: 8px;
        background-color: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 0.5rem;
      }

      .progress-fill {
        height: 100%;
        background-color: #3498db;
        transition: width 0.3s ease;
      }

      .progress-message {
        font-size: 0.875rem;
        color: #6c757d;
        margin: 0;
      }
    }

    .result-section, .error-section {
      margin: 1rem 0;
      padding: 1rem;
      background-color: #f8f9fa;
      border-radius: 4px;

      h5 {
        margin: 0 0 0.5rem 0;
        color: #495057;
        font-size: 0.875rem;
        text-transform: uppercase;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 0.875rem;
      }
    }

    .error-section {
      background-color: #f8d7da;
      color: #721c24;
    }

    .task-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e9ecef;
    }

    .timestamps {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #6c757d;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn {
      padding: 0.375rem 0.75rem;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        transform: translateY(-1px);
      }
    }

    .btn-retry {
      background-color: #3498db;
      color: white;

      &:hover {
        background-color: #2980b9;
      }
    }

    .btn-cancel {
      background-color: #ffc107;
      color: #212529;

      &:hover {
        background-color: #e0a800;
      }
    }

    .btn-delete {
      background-color: #dc3545;
      color: white;

      &:hover {
        background-color: #c82333;
      }
    }
  `]
})
export class TaskItemComponent {
  @Input() task!: Task;
  @Input() progress?: TaskProgress;
  @Output() retry = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  TaskStatus = TaskStatus;

  getStatusLabel(status: TaskStatus): string {
    const labels = {
      [TaskStatus.PENDING]: 'Pending',
      [TaskStatus.QUEUED]: 'Queued',
      [TaskStatus.PROCESSING]: 'Processing',
      [TaskStatus.COMPLETED]: 'Completed',
      [TaskStatus.FAILED]: 'Failed',
      [TaskStatus.CANCELLED]: 'Cancelled',
    };
    return labels[status] || status;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString();
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}