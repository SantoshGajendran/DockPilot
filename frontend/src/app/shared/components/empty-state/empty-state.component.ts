import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'dp-empty-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="empty-state-panel glass-panel">
      <div class="vector-art" aria-hidden="true">
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="empty-line-art"
        >
          <polygon points="32 6 56 18 56 46 32 58 8 46 8 18 32 6" stroke="var(--line-strong)" />
          <line x1="32" y1="6" x2="32" y2="58" stroke="var(--line)" />
          <polyline points="56 18 32 30 8 18" stroke="var(--line)" />
          <circle cx="32" cy="30" r="4" fill="var(--gold)" />
        </svg>
      </div>

      <div class="empty-text">
        <span class="empty-title">{{ title }}</span>
        @if (description) {
          <p class="empty-desc">{{ description }}</p>
        }
      </div>

      @if (actionLabel) {
        <button type="button" class="empty-action-btn btn-primary" (click)="actionClicked.emit()">
          @if (actionIcon) {
            <dp-icon [name]="actionIcon" [size]="16"></dp-icon>
          }
          <span>{{ actionLabel }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .empty-state-panel {
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      background: var(--bg-1);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
    }

    .vector-art {
      margin-bottom: 20px;
      color: var(--violet);
      filter: drop-shadow(0 0 16px rgba(139, 92, 246, 0.25));
    }

    .empty-text {
      max-width: 420px;
      margin-bottom: 24px;

      .empty-title {
        display: block;
        font-family: var(--font-sans);
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        color: var(--text);
        margin-bottom: 8px;
        text-transform: uppercase;
      }

      .empty-desc {
        margin: 0;
        font-family: var(--font-sans);
        font-size: 0.875rem;
        color: var(--text-dim);
        line-height: 1.5;
      }
    }

    .empty-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--gold);
      color: var(--bg-0);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      box-shadow: 0 0 16px rgba(212, 175, 55, 0.35);
      transition: transform var(--duration-120) var(--ease-out), background-color var(--duration-120) var(--ease-out);

      &:hover {
        background: var(--gold-hi);
        transform: translateY(-1px);
      }

      &:active {
        transform: scale(0.97);
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input({ required: true }) title = 'NO DATA AVAILABLE';
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Output() actionClicked = new EventEmitter<void>();
}
