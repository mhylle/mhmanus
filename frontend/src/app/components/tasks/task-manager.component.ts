import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from './task-list.component';
import { TaskFormComponent } from './task-form.component';

type TaskView = 'list' | 'create';

@Component({
  selector: 'app-task-manager',
  standalone: true,
  imports: [CommonModule, TaskListComponent, TaskFormComponent],
  template: `
    <div class="task-manager">
      <div class="task-header">
        <h2>Task Management</h2>
        <div class="view-tabs">
          <button 
            [class.active]="activeView() === 'list'"
            (click)="setView('list')"
            class="view-tab"
          >
            <span class="icon">📋</span>
            Task List
          </button>
          <button 
            [class.active]="activeView() === 'create'"
            (click)="setView('create')"
            class="view-tab"
          >
            <span class="icon">➕</span>
            Create Task
          </button>
        </div>
      </div>

      <div class="task-content">
        @if (activeView() === 'list') {
          <app-task-list></app-task-list>
        } @else if (activeView() === 'create') {
          <div class="create-task-container">
            <app-task-form (taskCreated)="onTaskCreated()"></app-task-form>
            <div class="form-help">
              <h4>Tips for creating effective tasks:</h4>
              <ul>
                <li>Be specific about what needs to be accomplished</li>
                <li>Include relevant context and requirements</li>
                <li>Set appropriate priority levels</li>
                <li>Tasks are processed by AI agents that will analyze and execute them</li>
              </ul>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    .task-manager {
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #f5f5f5;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      background-color: white;
      border-bottom: 1px solid #e9ecef;
      flex-shrink: 0;

      h2 {
        margin: 0;
        color: #2c3e50;
      }
    }

    .view-tabs {
      display: flex;
      gap: 0.5rem;

      .view-tab {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1.5rem;
        background: none;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        color: #6c757d;
        cursor: pointer;
        transition: all 0.3s;

        .icon {
          font-size: 1.2rem;
        }

        &:hover {
          background-color: #f8f9fa;
          color: #495057;
        }

        &.active {
          background-color: #3498db;
          border-color: #3498db;
          color: white;
        }
      }
    }

    .task-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .create-task-container {
      max-width: 800px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem;
      overflow-y: auto;

      app-task-form {
        display: block;
        margin-bottom: 2rem;
      }
    }

    .form-help {
      background-color: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1.5rem;

      h4 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: #2c3e50;
      }

      ul {
        margin: 0;
        padding-left: 1.5rem;

        li {
          margin-bottom: 0.5rem;
          color: #6c757d;
        }
      }
    }

    app-task-list {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
  `]
})
export class TaskManagerComponent {
  activeView = signal<TaskView>('list');

  setView(view: TaskView) {
    this.activeView.set(view);
  }

  onTaskCreated() {
    // Switch back to list view after creating a task
    this.activeView.set('list');
  }
}