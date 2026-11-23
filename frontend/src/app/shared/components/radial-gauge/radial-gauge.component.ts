import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dp-radial-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="radial-gauge-container" [style.width.px]="size" [style.height.px]="size">
      <svg
        [attr.width]="size"
        [attr.height]="size"
        [attr.viewBox]="'0 0 ' + size + ' ' + size"
        class="gauge-svg"
      >
        <!-- Background Track -->
        <circle
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          fill="none"
          stroke="var(--line)"
          [attr.stroke-width]="strokeWidth"
          [attr.stroke-dasharray]="dashArray"
          [attr.stroke-dashoffset]="trackOffset"
          [attr.transform]="'rotate(' + startAngle + ' ' + center + ' ' + center + ')'"
          class="gauge-track"
        />

        <!-- Value Arc -->
        <circle
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="gaugeColor"
          [attr.stroke-width]="strokeWidth"
          [attr.stroke-dasharray]="dashArray"
          [attr.stroke-dashoffset]="valueOffset"
          [attr.transform]="'rotate(' + startAngle + ' ' + center + ' ' + center + ')'"
          stroke-linecap="round"
          class="gauge-value-arc"
          [style.filter]="'drop-shadow(0 0 6px ' + gaugeColor + ')'"
        />
      </svg>

      <!-- Center Telemetry Display -->
      <div class="gauge-center-content">
        <span class="gauge-value tabular-nums">{{ value.toFixed(precision) }}</span>
        <span class="gauge-unit micro-label">{{ unit }}</span>
        @if (label) {
          <span class="gauge-label micro-label">{{ label }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
    }

    .radial-gauge-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gauge-svg {
      transform: rotate(0deg);
    }

    .gauge-value-arc {
      transition: stroke-dashoffset var(--duration-420) var(--ease-out), stroke var(--duration-220) var(--ease-out);
    }

    .gauge-center-content {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1.1;

      .gauge-value {
        font-family: var(--font-mono);
        font-size: 1.5rem;
        font-weight: 300;
        color: var(--text);
      }

      .gauge-unit {
        font-size: 10px;
        color: var(--text-dim);
      }

      .gauge-label {
        margin-top: 4px;
        font-size: 9px;
        color: var(--text-mute);
      }
    }
  `]
})
export class RadialGaugeComponent implements OnChanges {
  @Input() value = 0;
  @Input() min = 0;
  @Input() max = 100;
  @Input() size = 120;
  @Input() strokeWidth = 5;
  @Input() label?: string;
  @Input() unit = '%';
  @Input() precision = 0;

  @Input() warningThreshold = 75;
  @Input() criticalThreshold = 90;

  center = 60;
  radius = 48;
  startAngle = 135;
  readonly totalAngle = 270;
  circumference = 0;
  dashArray = '0 0';
  trackOffset = 0;
  valueOffset = 0;

  ngOnChanges(changes: SimpleChanges): void {
    this.calculateGeometry();
  }

  get gaugeColor(): string {
    if (this.value >= this.criticalThreshold) {
      return '#F43F5E'; // --status-critical
    }
    if (this.value >= this.warningThreshold) {
      return '#F59E0B'; // --status-warning
    }
    return '#34D399'; // --status-running
  }

  private calculateGeometry(): void {
    this.center = this.size / 2;
    this.radius = this.center - this.strokeWidth - 2;
    this.circumference = 2 * Math.PI * this.radius;

    const angleRatio = this.totalAngle / 360;
    const arcLength = this.circumference * angleRatio;
    this.dashArray = `${arcLength} ${this.circumference}`;
    this.trackOffset = 0;

    const clamped = Math.max(this.min, Math.min(this.max, this.value));
    const normalized = (clamped - this.min) / (this.max - this.min || 1);
    this.valueOffset = arcLength * (1 - normalized);
  }
}
