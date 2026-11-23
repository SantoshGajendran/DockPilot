import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ContainerStatus = 'running' | 'warning' | 'critical' | 'stopped' | 'restarting' | 'paused';

@Component({
  selector: 'dp-status-dot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-dot-wrapper" [class.show-label]="!!label">
      <span
        class="dot-core"
        [ngClass]="'status-' + normalizedStatus"
        [class.pulsing]="isPulsing"
      ></span>
      @if (label) {
        <span class="dot-label">{{ label }}</span>
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      line-height: 1;
    }

    .status-dot-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .dot-core {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
      transition: background-color var(--duration-120) var(--ease-out), box-shadow var(--duration-220) var(--ease-out);

      &.status-running {
        background-color: var(--status-running);
        box-shadow: 0 0 8px var(--status-running-glow);
      }

      &.status-warning {
        background-color: var(--status-warning);
        box-shadow: 0 0 8px var(--status-warning-glow);
      }

      &.status-critical {
        background-color: var(--status-critical);
        box-shadow: 0 0 8px var(--status-critical-glow);
      }

      &.status-stopped {
        background-color: var(--status-stopped);
        box-shadow: none;
      }

      &.status-restarting {
        background-color: var(--status-restarting);
        box-shadow: 0 0 8px var(--status-restarting-glow);
      }

      &.pulsing {
        animation: dotPulse 2.2s infinite ease-in-out;
      }
    }

    .dot-label {
      font-family: var(--font-sans);
      font-size: 0.75rem;
      text-transform: capitalize;
      color: var(--text);
    }

    @keyframes dotPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.3);
        opacity: 0.75;
      }
    }
  `]
})
export class StatusDotComponent {
  @Input({ required: true }) status: ContainerStatus | string = 'stopped';
  @Input() label?: string;

  get normalizedStatus(): ContainerStatus {
    const s = (this.status || '').toLowerCase();
    if (s.includes('run')) return 'running';
    if (s.includes('warn')) return 'warning';
    if (s.includes('crit') || s.includes('fail') || s.includes('err') || s.includes('dead')) return 'critical';
    if (s.includes('restart')) return 'restarting';
    return 'stopped';
  }

  get isPulsing(): boolean {
    const s = this.normalizedStatus;
    // Pulse only for "running" and "restarting"; static for stopped
    return s === 'running' || s === 'restarting';
  }
}
