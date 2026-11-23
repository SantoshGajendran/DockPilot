import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { IconComponent } from '../icon/icon.component';

export interface ConfirmDangerData {
  title?: string;
  targetName: string;
  actionName?: string;
  warningMessage?: string;
}

@Component({
  selector: 'dp-confirm-danger-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, IconComponent],
  template: `
    <div class="danger-dialog-container glass-panel">
      <div class="dialog-header">
        <dp-icon name="alerts" [size]="20" class="warn-icon"></dp-icon>
        <span class="dialog-title">{{ dialogTitle }}</span>
      </div>

      <div class="dialog-body">
        <p class="body-lead">
          CRITICAL ACTION REQUIRED: Confirm
          <strong class="action-highlight">{{ actionLabel | uppercase }}</strong>
          for target
        </p>
        <div class="target-card">
          <span class="target-name tabular-nums">{{ targetItemName }}</span>
        </div>
        <p class="warning-detail">
          {{ warningDetail || 'This operational command is destructive and cannot be undone once dispatched.' }}
        </p>
      </div>

      <div class="dialog-actions">
        <button type="button" class="btn-cancel" (click)="cancel()">
          DISENGAGE
        </button>

        <button
          type="button"
          class="btn-hold-confirm"
          (mousedown)="startHold()"
          (mouseup)="cancelHold()"
          (mouseleave)="cancelHold()"
          (touchstart)="startHold()"
          (touchend)="cancelHold()"
          [class.holding]="isHolding"
          [attr.aria-label]="'Hold 1.2s to confirm ' + actionLabel"
        >
          <div class="hold-progress-fill" [style.width.%]="holdProgress"></div>
          <span class="btn-label">
            {{ isHolding ? 'HOLDING... ' + (1.2 - (holdProgress / 100 * 1.2)).toFixed(1) + 's' : 'HOLD 1.2s TO CONFIRM' }}
          </span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .danger-dialog-container {
      background: var(--bg-1);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-lg);
      padding: 24px;
      max-width: 480px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9), 0 0 24px var(--status-critical-glow);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;

      .warn-icon {
        color: var(--status-critical);
      }

      .dialog-title {
        font-family: var(--font-sans);
        font-size: 1rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: var(--text);
        text-transform: uppercase;
      }
    }

    .dialog-body {
      margin-bottom: 24px;

      .body-lead {
        margin: 0 0 10px 0;
        font-family: var(--font-sans);
        font-size: 0.875rem;
        color: var(--text-dim);

        .action-highlight {
          color: var(--status-critical);
        }
      }

      .target-card {
        padding: 10px 14px;
        background: var(--bg-2);
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        margin-bottom: 12px;

        .target-name {
          font-family: var(--font-mono);
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text);
          word-break: break-all;
        }
      }

      .warning-detail {
        margin: 0;
        font-family: var(--font-sans);
        font-size: 0.8125rem;
        color: var(--text-mute);
        line-height: 1.4;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;

      .btn-cancel {
        padding: 10px 16px;
        background: transparent;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        color: var(--text-dim);
        font-family: var(--font-mono);
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        cursor: pointer;
        transition: background-color var(--duration-120) var(--ease-out), color var(--duration-120) var(--ease-out);

        &:hover {
          background: var(--bg-3);
          color: var(--text);
        }
      }

      .btn-hold-confirm {
        position: relative;
        padding: 10px 18px;
        background: transparent;
        border: 1px solid var(--status-critical);
        border-radius: var(--radius-sm);
        color: var(--status-critical);
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        cursor: pointer;
        overflow: hidden;
        user-select: none;
        transition: transform var(--duration-120) var(--ease-out);

        &:active {
          transform: scale(0.97);
        }

        &.holding {
          color: #fff;
        }

        .hold-progress-fill {
          position: absolute;
          inset: 0;
          background: var(--status-critical);
          opacity: 0.85;
          width: 0;
          transition: width 50ms linear;
        }

        .btn-label {
          position: relative;
          z-index: 1;
        }
      }
    }
  `]
})
export class ConfirmDangerDialogComponent implements OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDangerDialogComponent>, { optional: true });
  private readonly injectedData: ConfirmDangerData | null = inject(MAT_DIALOG_DATA, { optional: true });

  @Input() title?: string;
  @Input() targetName?: string;
  @Input() actionName?: string;
  @Input() warningMessage?: string;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isHolding = false;
  holdProgress = 0;
  private holdTimer: any = null;
  private holdInterval: any = null;
  private readonly holdDurationMs = 1200; // 1.2s verbatim hold duration

  get dialogTitle(): string {
    return this.title || this.injectedData?.title || 'DANGER PROTOCOL';
  }

  get targetItemName(): string {
    return this.targetName || this.injectedData?.targetName || 'SPECIFIED_ENTITY';
  }

  get actionLabel(): string {
    return this.actionName || this.injectedData?.actionName || 'TERMINATION';
  }

  get warningDetail(): string | undefined {
    return this.warningMessage || this.injectedData?.warningMessage;
  }

  startHold(): void {
    this.isHolding = true;
    this.holdProgress = 0;
    const startTime = Date.now();

    this.holdInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      this.holdProgress = Math.min((elapsed / this.holdDurationMs) * 100, 100);
    }, 20);

    this.holdTimer = setTimeout(() => {
      this.finishHold();
    }, this.holdDurationMs);
  }

  cancelHold(): void {
    if (!this.isHolding) return;
    this.isHolding = false;
    this.holdProgress = 0;
    clearInterval(this.holdInterval);
    clearTimeout(this.holdTimer);
  }

  private finishHold(): void {
    this.cancelHold();
    this.confirmed.emit();
    if (this.dialogRef) {
      this.dialogRef.close(true);
    }
  }

  cancel(): void {
    this.cancelHold();
    this.cancelled.emit();
    if (this.dialogRef) {
      this.dialogRef.close(false);
    }
  }

  ngOnDestroy(): void {
    this.cancelHold();
  }
}
