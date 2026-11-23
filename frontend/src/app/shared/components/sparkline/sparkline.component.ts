import {
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dp-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="width"
      [attr.height]="height"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      class="sparkline-svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="strokeColor" stop-opacity="0.35" />
          <stop offset="100%" [attr.stop-color]="strokeColor" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      @if (areaPath) {
        <path [attr.d]="areaPath" [attr.fill]="'url(#' + gradientId + ')'" class="sparkline-area" />
      }
      @if (linePath) {
        <path
          [attr.d]="linePath"
          fill="none"
          [attr.stroke]="strokeColor"
          [attr.stroke-width]="strokeWidth"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="sparkline-line"
        />
      }
    </svg>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
      line-height: 0;
    }

    .sparkline-svg {
      overflow: visible;
    }

    .sparkline-line {
      transition: stroke var(--duration-120) var(--ease-out), filter var(--duration-120) var(--ease-out);
    }

    :host(:hover) .sparkline-line {
      filter: drop-shadow(0 0 6px var(--violet-hi));
    }
  `]
})
export class SparklineComponent implements OnChanges {
  @Input() data: number[] = [];
  @Input() width = 100;
  @Input() height = 24;
  @Input() strokeColor = '#B39DFF'; // --violet-hi default
  @Input() strokeWidth = 1.5;

  readonly gradientId = `spk-grad-${Math.random().toString(36).substring(2, 9)}`;

  linePath = '';
  areaPath = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['width'] || changes['height']) {
      this.calculatePaths();
    }
  }

  private calculatePaths(): void {
    if (!this.data || this.data.length < 2) {
      this.linePath = '';
      this.areaPath = '';
      return;
    }

    const min = Math.min(...this.data);
    const max = Math.max(...this.data);
    const range = max - min || 1;
    const padding = 2;
    const effHeight = this.height - padding * 2;
    const effWidth = this.width - padding * 2;
    const stepX = effWidth / (this.data.length - 1);

    const points: [number, number][] = this.data.map((val, idx) => {
      const x = padding + idx * stepX;
      const y = padding + effHeight - ((val - min) / range) * effHeight;
      return [x, y];
    });

    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i][0]} ${points[i][1]}`;
    }

    this.linePath = d;
    this.areaPath = `${d} L ${points[points.length - 1][0]} ${this.height} L ${points[0][0]} ${this.height} Z`;
  }
}
