import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusDotComponent } from '../status-dot/status-dot.component';

export interface HeatTileData {
  id: string;
  name: string;
  status: 'running' | 'warning' | 'critical' | 'stopped' | 'restarting';
  cpuPercent: number;
  memoryUsageMb: number;
}

export type HeatTileItem = HeatTileData;

@Component({
  selector: 'dp-heat-tile',
  standalone: true,
  imports: [CommonModule, StatusDotComponent],
  template: `
    <div
      class="heat-tile"
      [style.background-color]="tileColor"
      [class.active-hover]="isHovered"
      (mouseenter)="isHovered = true"
      (mouseleave)="isHovered = false"
      (click)="navigateToDetail()"
      [attr.aria-label]="item.name + ': ' + item.cpuPercent + '% CPU'"
    >
      @if (isHovered) {
        <div class="mini-telemetry-card glass-panel" (click)="$event.stopPropagation()">
          <div class="card-header">
            <dp-status-dot [status]="item.status"></dp-status-dot>
            <span class="card-name">{{ item.name }}</span>
          </div>
          <div class="card-metrics">
            <div class="metric-row">
              <span class="m-label micro-label">CPU</span>
              <span class="m-val tabular-nums">{{ item.cpuPercent.toFixed(1) }}%</span>
            </div>
            <div class="metric-row">
              <span class="m-label micro-label">MEM</span>
              <span class="m-val tabular-nums">{{ item.memoryUsageMb.toFixed(0) }} MB</span>
            </div>
          </div>
          <span class="card-hint micro-label">CLICK TO INSPECT</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      position: relative;
    }

    .heat-tile {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform var(--duration-120) var(--ease-out), box-shadow var(--duration-120) var(--ease-out);

      &:hover {
        transform: scale(1.25);
        z-index: 50;
        box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
      }
    }

    .mini-telemetry-card {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      width: 170px;
      padding: 10px 12px;
      background: var(--bg-1);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.85);
      pointer-events: none;
      z-index: 100;
      animation: cardPop 150ms var(--ease-out);

      .card-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;

        .card-name {
          font-family: var(--font-sans);
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .card-metrics {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-bottom: 6px;

        .metric-row {
          display: flex;
          justify-content: space-between;

          .m-label {
            color: var(--text-mute);
          }

          .m-val {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--text-dim);
          }
        }
      }

      .card-hint {
        display: block;
        font-size: 9px;
        color: var(--gold);
        text-align: center;
        letter-spacing: 0.05em;
      }
    }

    @keyframes cardPop {
      from { opacity: 0; transform: translate(-50%, 6px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
  `]
})
export class HeatTileComponent {
  @Input({ required: true }) item!: HeatTileData;
  @Output() selected = new EventEmitter<HeatTileData>();

  private readonly router = inject(Router);
  isHovered = false;

  get tileColor(): string {
    if (!this.item || this.item.status === 'stopped') {
      return '#20202E'; // --bg-4
    }
    const cpu = this.item.cpuPercent || 0;
    if (cpu >= 85) return '#F43F5E'; // critical red
    if (cpu >= 60) return '#F59E0B'; // warning amber
    if (cpu >= 25) return '#8B5CF6'; // active violet
    return '#34D399'; // healthy green
  }

  navigateToDetail(): void {
    this.selected.emit(this.item);
    if (this.item?.id) {
      this.router.navigateByUrl(`/containers/${this.item.id}`);
    }
  }
}

@Component({
  selector: 'dp-heat-tile-grid',
  standalone: true,
  imports: [CommonModule, HeatTileComponent],
  template: `
    <div class="heat-tile-grid" role="group" aria-label="Container heat grid">
      @for (tile of tiles; track tile.id) {
        <dp-heat-tile [item]="tile" (selected)="tileClick.emit($event)"></dp-heat-tile>
      }
    </div>
  `,
  styles: [`
    .heat-tile-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
  `]
})
export class HeatTileGridComponent {
  @Input() tiles: HeatTileData[] = [];
  @Output() tileClick = new EventEmitter<HeatTileData>();
}

