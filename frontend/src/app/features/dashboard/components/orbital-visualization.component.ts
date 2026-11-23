import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatusDotComponent } from '../../../shared/components/status-dot/status-dot.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { AtmosphereService } from '../../../core/services/atmosphere.service';

export interface OrbitalNode {
  id: string;
  name: string;
  cpuPercent: number;
  memoryBytes: number;
  status: 'running' | 'stopped' | 'restarting' | 'warning' | 'critical' | 'paused';
}

@Component({
  selector: 'dp-orbital-visualization',
  standalone: true,
  imports: [CommonModule, StatusDotComponent, IconComponent],
  template: `
    <div class="orbital-container" [class.quiet-mode]="atmosphereService.quietMode()">
      <!-- Background Star/Grid Field -->
      <div class="radar-sweep-line" aria-hidden="true"></div>

      <!-- Concentric Orbital Rings -->
      <svg class="orbital-rings-svg" viewBox="0 0 500 500" aria-hidden="true">
        <circle cx="250" cy="250" r="80" class="ring-core ring-cpu" />
        <circle cx="250" cy="250" r="140" class="ring-orbit ring-inner" />
        <circle cx="250" cy="250" r="195" class="ring-orbit ring-mid" />
        <circle cx="250" cy="250" r="235" class="ring-orbit ring-outer" />

        <!-- Host Core Radial Glow Fill -->
        <circle
          cx="250"
          cy="250"
          r="60"
          class="host-core-glow"
          [style.stroke-dasharray]="cpuDashArray()"
        />
      </svg>

      <!-- Center Host Core Station -->
      <div class="host-core-center" (click)="onHostClick()">
        <dp-icon name="server" [size]="22" class="core-icon"></dp-icon>
        <span class="core-label micro-label">HOST CORE</span>
        <span class="core-val tabular-nums">{{ hostCpu.toFixed(1) }}% CPU</span>
      </div>

      <!-- Orbiting Container Nodes -->
      <div class="orbits-layer" [class.paused]="hoveredNode !== null">
        @for (node of processedNodes(); track node.id; let idx = $index) {
          <div
            class="orbital-track"
            [style.width.px]="node.orbitRadius * 2"
            [style.height.px]="node.orbitRadius * 2"
            [style.animation-duration.s]="node.orbitSpeed"
            [style.animation-delay.s]="node.orbitDelay"
          >
            <div
              class="orbital-craft-node"
              [style.transform]="'rotate(-' + node.initialAngle + 'deg)'"
              (mouseenter)="hoveredNode = node"
              (mouseleave)="hoveredNode = null"
              (click)="navigateToDetail(node.id)"
              [attr.aria-label]="node.name + ': ' + node.cpuPercent + '% CPU'"
              tabindex="0"
              role="button"
            >
              <span
                class="node-beacon"
                [style.background-color]="node.color"
                [style.box-shadow]="'0 0 10px ' + node.color"
              ></span>
              <span class="node-id-label micro-label">{{ node.name }}</span>

              <!-- Hover Telemetry Preview Card -->
              @if (hoveredNode?.id === node.id) {
                <div class="node-telemetry-card glass-panel" (click)="$event.stopPropagation()">
                  <div class="card-head">
                    <dp-status-dot [status]="node.status"></dp-status-dot>
                    <span class="card-title">{{ node.name }}</span>
                  </div>
                  <div class="card-stats">
                    <div class="stat-row">
                      <span class="micro-label">CPU LOAD</span>
                      <span class="stat-num tabular-nums">{{ node.cpuPercent.toFixed(1) }}%</span>
                    </div>
                    <div class="stat-row">
                      <span class="micro-label">MEMORY</span>
                      <span class="stat-num tabular-nums">{{ formatBytes(node.memoryBytes) }}</span>
                    </div>
                  </div>
                  <span class="card-action-hint micro-label">CLICK TO INSPECT CRAFT ↗</span>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <div class="orbital-legend">
        <span class="legend-item"><span class="legend-dot green"></span> Running</span>
        <span class="legend-item"><span class="legend-dot amber"></span> Warning</span>
        <span class="legend-item"><span class="legend-dot rose"></span> Critical</span>
        <span class="legend-item"><span class="legend-dot mute"></span> Stopped</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .orbital-container {
      position: relative;
      width: 100%;
      height: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: var(--radius-md);
      background: radial-gradient(circle at center, rgba(32, 32, 46, 0.4) 0%, rgba(6, 6, 9, 0.8) 75%);
      border: 1px solid var(--line-subtle);
    }

    .radar-sweep-line {
      position: absolute;
      width: 50%;
      height: 2px;
      top: 50%;
      left: 50%;
      transform-origin: 0% 0%;
      background: linear-gradient(90deg, var(--gold) 0%, transparent 100%);
      opacity: 0.15;
      animation: radarSweep 10s linear infinite;
      pointer-events: none;
    }

    @keyframes radarSweep {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .orbital-rings-svg {
      position: absolute;
      width: 480px;
      height: 480px;
      pointer-events: none;

      .ring-orbit {
        fill: none;
        stroke: var(--line-subtle);
        stroke-width: 1;
        stroke-dasharray: 3 6;
      }

      .ring-core {
        fill: none;
        stroke: rgba(212, 175, 55, 0.25);
        stroke-width: 1.5;
      }

      .host-core-glow {
        fill: none;
        stroke: var(--gold);
        stroke-width: 3;
        stroke-linecap: round;
        filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.6));
        transition: stroke-dasharray 0.6s var(--ease-out);
      }
    }

    .host-core-center {
      position: relative;
      z-index: 5;
      width: 104px;
      height: 104px;
      border-radius: 50%;
      background: var(--bg-1);
      border: 1px solid var(--line-strong);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      box-shadow: 0 0 32px rgba(212, 175, 55, 0.15);
      cursor: pointer;
      transition: transform var(--duration-120) var(--ease-out), border-color var(--duration-120) var(--ease-out);

      &:hover {
        transform: scale(1.05);
        border-color: var(--gold);
      }

      .core-icon {
        color: var(--gold);
      }

      .core-label {
        font-size: 8px;
        color: var(--text-dim);
      }

      .core-val {
        font-size: 11px;
        color: var(--text-high);
        font-weight: 500;
      }
    }

    .orbits-layer {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;

      &.paused .orbital-track {
        animation-play-state: paused !important;
      }
    }

    .orbital-track {
      position: absolute;
      border-radius: 50%;
      animation: orbitRotate linear infinite;
      pointer-events: none;
    }

    @keyframes orbitRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .orbital-craft-node {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 6px;

      &:hover .node-beacon {
        transform: scale(1.4);
      }
    }

    .node-beacon {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--bg-0);
      transition: transform var(--duration-120) var(--ease-out);
    }

    .node-id-label {
      font-size: 9px;
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-dim);
      background: rgba(6, 6, 9, 0.85);
      padding: 2px 4px;
      border-radius: var(--radius-xs);
      border: 1px solid var(--line-subtle);
    }

    .node-telemetry-card {
      position: absolute;
      top: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      width: 190px;
      background: var(--bg-1);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      padding: 10px 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      gap: 8px;
      animation: popIn var(--duration-120) var(--ease-out);

      .card-head {
        display: flex;
        align-items: center;
        gap: 6px;

        .card-title {
          font-family: var(--font-display);
          font-size: 12px;
          color: var(--text-high);
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .card-stats {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .stat-num {
            font-size: 11px;
            color: var(--gold);
          }
        }
      }

      .card-action-hint {
        font-size: 8px;
        color: var(--text-dim);
        border-top: 1px solid var(--line-subtle);
        padding-top: 6px;
        text-align: right;
      }
    }

    @keyframes popIn {
      from { opacity: 0; transform: translate(-50%, -6px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    .orbital-legend {
      position: absolute;
      bottom: 12px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-dim);
      background: rgba(6, 6, 9, 0.7);
      padding: 4px 10px;
      border-radius: var(--radius-xs);
      border: 1px solid var(--line-subtle);

      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .legend-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;

        &.green { background: #34D399; }
        &.amber { background: #F59E0B; }
        &.rose { background: #F43F5E; }
        &.mute { background: #6B6980; }
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .radar-sweep-line,
      .orbital-track {
        animation: none !important;
      }
    }
  `]
})
export class OrbitalVisualizationComponent {
  readonly atmosphereService = inject(AtmosphereService);
  private readonly router = inject(Router);

  @Input() hostCpu = 0;
  @Input() hostMemory = 0;
  @Input() nodes: OrbitalNode[] = [];
  @Output() nodeSelect = new EventEmitter<string>();

  hoveredNode: OrbitalNode | null = null;

  readonly cpuDashArray = computed(() => {
    const circumference = 2 * Math.PI * 60;
    const progress = Math.min(100, Math.max(0, this.hostCpu)) / 100;
    return `${progress * circumference} ${circumference}`;
  });

  readonly processedNodes = computed(() => {
    const radiusTiers = [140, 195, 235];
    const speeds = [32, 48, 64];

    return this.nodes.slice(0, 12).map((n, idx) => {
      const tierIndex = idx % 3;
      const radius = radiusTiers[tierIndex];
      const speed = speeds[tierIndex];
      const delay = -(idx * 7);

      let color = '#34D399'; // healthy green
      if (n.status === 'stopped') color = '#6B6980';
      else if (n.cpuPercent >= 85 || n.status === 'critical') color = '#F43F5E';
      else if (n.cpuPercent >= 60 || n.status === 'warning') color = '#F59E0B';

      return {
        ...n,
        orbitRadius: radius,
        orbitSpeed: speed,
        orbitDelay: delay,
        initialAngle: (idx * 360) / Math.max(1, this.nodes.length),
        color
      };
    });
  });

  navigateToDetail(containerId: string): void {
    this.nodeSelect.emit(containerId);
    if (containerId) {
      this.router.navigate(['/containers', containerId]);
    }
  }

  onHostClick(): void {
    this.router.navigate(['/host']);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KiB', 'MiB', 'GiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i === 0) return `${bytes} B`;
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
