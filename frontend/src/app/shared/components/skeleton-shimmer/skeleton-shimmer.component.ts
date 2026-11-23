import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dp-skeleton-shimmer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (variant === 'card') {
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton-box title-bar"></div>
        @for (i of lineArray; track i) {
          <div class="skeleton-box text-line"></div>
        }
      </div>
    } @else if (variant === 'table') {
      <div class="skeleton-table" aria-hidden="true">
        @for (i of lineArray; track i) {
          <div class="table-row-shimmer">
            <div class="skeleton-box" style="width: 25%; height: 16px;"></div>
            <div class="skeleton-box" style="width: 45%; height: 16px;"></div>
            <div class="skeleton-box" style="width: 20%; height: 16px;"></div>
          </div>
        }
      </div>
    } @else {
      <div
        class="skeleton-box"
        [class.circle]="variant === 'circle'"
        [class.text-line]="variant === 'text'"
        [style.width]="width"
        [style.height]="height"
        [style.border-radius]="borderRadius"
        aria-hidden="true"
      ></div>
    }
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
      line-height: 0;
    }

    .skeleton-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;

      .title-bar {
        width: 40%;
        height: 20px;
      }
    }

    .skeleton-table {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;

      .table-row-shimmer {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid var(--line-subtle);
      }
    }

    .skeleton-box {
      width: 100%;
      height: 100%;
      min-height: 16px;
      background: linear-gradient(
        90deg,
        var(--bg-2) 0%,
        var(--bg-3) 50%,
        var(--bg-2) 100%
      );
      background-size: 200% 100%;
      border-radius: var(--radius-sm);
      animation: shimmerSweep 1.8s ease-in-out infinite;

      &.circle {
        border-radius: 50% !important;
      }

      &.text-line {
        height: 14px;
        margin: 4px 0;
      }
    }

    @keyframes shimmerSweep {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .skeleton-box {
        animation: none;
        background: var(--bg-2);
      }
    }
  `]
})
export class SkeletonShimmerComponent {
  @Input() width = '100%';
  @Input() height = '20px';
  @Input() borderRadius?: string;
  @Input() variant: 'rect' | 'circle' | 'text' | 'card' | 'table' = 'rect';
  @Input() lines = 1;

  get lineArray(): number[] {
    return Array.from({ length: Math.max(1, this.lines) }, (_, i) => i);
  }
}
