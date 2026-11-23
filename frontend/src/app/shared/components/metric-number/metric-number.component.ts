import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  booleanAttribute
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type MetricSeverity = 'normal' | 'running' | 'warning' | 'critical';

@Component({
  selector: 'dp-metric-number',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metric-container" [class.size-lg]="size === 'lg'" [class.size-xl]="size === 'xl'">
      @if (label) {
        <span class="metric-label micro-label">{{ label }}</span>
      }

      <div class="metric-display" [ngClass]="severityClass">
        <span class="numeral tabular-nums">{{ displayValue.toFixed(precision) }}</span>
        @if (unit) {
          <span class="metric-unit">{{ unit }}</span>
        }
        @if (showDelta && delta !== 0) {
          <span class="delta-arrow" [class.delta-up]="delta > 0" [class.delta-down]="delta < 0">
            {{ delta > 0 ? '▲' : '▼' }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .metric-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .metric-label {
      color: var(--text-mute);
    }

    .metric-display {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-family: var(--font-mono);
      font-weight: 300;
      color: var(--text);
      line-height: 1;

      &.severity-running,
      &.severity-normal {
        color: var(--status-running);
      }

      &.severity-warning {
        color: var(--status-warning);
        text-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
      }

      &.severity-critical {
        color: var(--status-critical);
        text-shadow: 0 0 16px rgba(244, 63, 94, 0.45);
      }
    }

    .numeral {
      font-size: 36px;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
      transition: color var(--duration-220) var(--ease-out);
    }

    .size-lg .numeral {
      font-size: 48px;
    }

    .size-xl .numeral {
      font-size: 72px;
    }

    .metric-unit {
      font-size: 0.875rem;
      font-weight: 400;
      color: var(--text-dim);
    }

    .delta-arrow {
      font-size: 0.75rem;
      line-height: 1;

      &.delta-up {
        color: var(--status-running);
      }

      &.delta-down {
        color: var(--status-critical);
      }
    }
  `]
})
export class MetricNumberComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) value = 0;
  @Input() label?: string;
  @Input() unit?: string;
  @Input() set suffix(val: string) { this.unit = val; }
  @Input() precision = 0;
  @Input() set decimals(val: number) { this.precision = val; }
  @Input() size: 'md' | 'lg' | 'xl' = 'md';
  @Input({ transform: booleanAttribute }) showDelta = false;
  @Input('delta') set inputDelta(val: number) {
    this.delta = val;
    this.showDelta = true;
  }

  // Thresholds for auto-coloring
  @Input() warningThreshold = 75;
  @Input() criticalThreshold = 90;

  displayValue = 0;
  delta = 0;
  private animFrameId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      const prev = changes['value'].previousValue ?? this.value;
      const curr = changes['value'].currentValue ?? 0;
      this.delta = curr - prev;
      this.animateTo(curr, prev);
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  get severityClass(): string {
    if (this.value >= this.criticalThreshold) {
      return 'severity-critical';
    }
    if (this.value >= this.warningThreshold) {
      return 'severity-warning';
    }
    return 'severity-normal';
  }

  private animateTo(target: number, start: number): void {
    if (typeof window === 'undefined') {
      this.displayValue = target;
      return;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }

    const startTime = performance.now();
    const duration = 420; // 420ms token duration
    const initial = this.displayValue || start;

    const tick = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Spring-like overshoot easeOut
      const ease = 1 - Math.pow(1 - progress, 3);
      this.displayValue = initial + (target - initial) * ease;

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(tick);
      } else {
        this.displayValue = target;
        this.animFrameId = null;
      }
    };

    this.animFrameId = requestAnimationFrame(tick);
  }
}
