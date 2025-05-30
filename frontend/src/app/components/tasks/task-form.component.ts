import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { CreateTaskDto, TaskPriority } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="task-form">
      <h3>Create New Task</h3>
      
      <form (ngSubmit)="onSubmit()" #taskForm="ngForm">
        <div class="form-group">
          <label for="title">Task Title</label>
          <input
            type="text"
            id="title"
            name="title"
            [(ngModel)]="task.title"
            required
            minlength="3"
            class="form-control"
            placeholder="Enter a descriptive title"
            #titleInput="ngModel"
          />
          @if (titleInput.invalid && titleInput.touched) {
            <div class="error">Title must be at least 3 characters</div>
          }
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            name="description"
            [(ngModel)]="task.description"
            required
            minlength="10"
            rows="4"
            class="form-control"
            placeholder="Describe what needs to be done..."
            #descInput="ngModel"
          ></textarea>
          @if (descInput.invalid && descInput.touched) {
            <div class="error">Description must be at least 10 characters</div>
          }
        </div>

        <div class="form-group">
          <label for="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            [(ngModel)]="task.priority"
            class="form-control"
          >
            <option [value]="TaskPriority.LOW">Low</option>
            <option [value]="TaskPriority.MEDIUM">Medium</option>
            <option [value]="TaskPriority.HIGH">High</option>
            <option [value]="TaskPriority.CRITICAL">Critical</option>
          </select>
        </div>

        <div class="form-actions">
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="taskForm.invalid || isSubmitting()"
          >
            {{ isSubmitting() ? 'Creating...' : 'Create Task' }}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            (click)="resetForm(taskForm)"
            [disabled]="isSubmitting()"
          >
            Reset
          </button>
        </div>
      </form>

      @if (error()) {
        <div class="error-message">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .task-form {
      background-color: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;

      h3 {
        margin-top: 0;
        margin-bottom: 1.5rem;
        color: #2c3e50;
      }
    }

    .form-group {
      margin-bottom: 1.5rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #495057;
      }
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 1rem;
      transition: border-color 0.3s;

      &:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
      }

      &.ng-invalid.ng-touched {
        border-color: #dc3545;
      }
    }

    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }

    .error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.3s;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background-color: #3498db;
      color: white;

      &:hover:not(:disabled) {
        background-color: #2980b9;
      }
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;

      &:hover:not(:disabled) {
        background-color: #5a6268;
      }
    }

    .error-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }
  `]
})
export class TaskFormComponent {
  @Output() taskCreated = new EventEmitter<void>();

  TaskPriority = TaskPriority;
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  task: CreateTaskDto = {
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
  };

  constructor(private taskService: TaskService) {}

  onSubmit() {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    this.taskService.createTask(this.task).subscribe({
      next: (createdTask) => {
        console.log('Task created:', createdTask);
        this.resetForm();
        this.taskCreated.emit();
        this.isSubmitting.set(false);
      },
      error: (error) => {
        console.error('Error creating task:', error);
        this.error.set('Failed to create task. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  resetForm(form?: any) {
    this.task = {
      title: '',
      description: '',
      priority: TaskPriority.MEDIUM,
    };
    this.error.set(null);
    if (form) {
      form.resetForm();
    }
  }
}