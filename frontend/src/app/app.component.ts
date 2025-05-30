import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChatComponent } from './components/chat/chat.component';
import { TaskManagerComponent } from './components/tasks/task-manager.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ChatComponent, TaskManagerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'AI Agent System';
  activeView = signal<'chat' | 'tasks'>('chat');
}
