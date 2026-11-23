import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'dp-toast-container',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="toast-stack-container" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast-item glass-panel"
          [ngClass]="'toast-' + toast.severity"
          role="alert"
        >
          <div class="toast-glyph">
            <dp-icon [name]="getGlyph(toast.severity)" [size]="16"></dp-icon>
          </div>
          <div class="toast-content">
            <span class="toast-msg">{{ toast.message }}</span>
          </div>
          <button type="button" class="toast-close" (click)="dismiss(toast.id)" aria-label="Dismiss">
            <dp-icon name="close" [size]="14"></dp-icon>
          </button>
          <div
            class="toast-progress-bar"
            [style.animation-duration.ms]="toast.durationMs"
          ></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      width: calc(100% - 48px);
      pointer-events: none;
    }

    .toast-item {
      position: relative;
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-1);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.85);
      pointer-events: auto;
      overflow: hidden;
      animation: toastSlideIn var(--duration-220) var(--ease-out);

      &.toast-success {
        border-color: rgba(52, 211, 153, 0.4);
        .toast-glyph { color: var(--status-running); }
        .toast-progress-bar { background: var(--status-running); }
      }

      &.toast-warning {
        border-color: rgba(245, 158, 11, 0.4);
        .toast-glyph { color: var(--status-warning); }
        .toast-progress-bar { background: var(--status-warning); }
      }

      &.toast-error,
      &.toast-critical {
        border-color: rgba(244, 63, 94, 0.5);
        .toast-glyph { color: var(--status-critical); }
        .toast-progress-bar { background: var(--status-critical); }
      }

      &.toast-info {
        border-color: rgba(139, 92, 246, 0.4);
        .toast-glyph { color: var(--violet-hi); }
        .toast-progress-bar { background: var(--violet-hi); }
      }
    }

    .toast-glyph {
      margin-right: 12px;
      flex-shrink: 0;
    }

    .toast-content {
      flex: 1;

      .toast-msg {
        font-family: var(--font-sans);
        font-size: 0.8125rem;
        color: var(--text);
        line-height: 1.4;
      }
    }

    .toast-close {
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      margin-left: 8px;

      &:hover {
        color: var(--text);
        background: var(--bg-3);
      }
    }

    .toast-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      width: 100%;
      animation: toastProgress linear forwards;
    }

    @keyframes toastSlideIn {
      from {
        opacity: 0;
        transform: translate3d(24px, 0, 0);
      }
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    @keyframes toastProgress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `]
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  getGlyph(severity: string): string {
    switch (severity) {
      case 'success': return 'check';
      case 'warning': return 'alerts';
      case 'error':
      case 'critical': return 'alerts';
      default: return 'command';
    }
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
