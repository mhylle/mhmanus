import { Component, ElementRef, ViewChild, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LLMService } from '../../services/llm.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  
  inputMessage = signal('');
  
  constructor(public llmService: LLMService) {
    // Auto-scroll when new messages arrive
    effect(() => {
      const messages = this.llmService.messages();
      if (messages.length > 0) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  async sendMessage() {
    const message = this.inputMessage().trim();
    if (!message || this.llmService.isLoading()) return;

    this.inputMessage.set('');
    await this.llmService.sendMessage(message);
  }

  private scrollToBottom() {
    if (this.scrollContainer) {
      const element = this.scrollContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}