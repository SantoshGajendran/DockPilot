import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { GlassPanelComponent } from '../../shared/components/glass-panel/glass-panel.component';
import { MetricNumberComponent } from '../../shared/components/metric-number/metric-number.component';
import { SparklineComponent } from '../../shared/components/sparkline/sparkline.component';
import { RadialGaugeComponent } from '../../shared/components/radial-gauge/radial-gauge.component';
import { StatusDotComponent } from '../../shared/components/status-dot/status-dot.component';
import { HeatTileComponent, HeatTileGridComponent, HeatTileData } from '../../shared/components/heat-tile/heat-tile.component';
import { SkeletonShimmerComponent } from '../../shared/components/skeleton-shimmer/skeleton-shimmer.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ConfirmDangerDialogComponent } from '../../shared/components/confirm-danger-dialog/confirm-danger-dialog.component';
import { ToastService } from '../../core/services/toast.service';
import { MagneticHoverDirective } from '../../shared/directives/magnetic-hover.directive';

@Component({
  selector: 'dp-components-gallery',
  standalone: true,
  imports: [
    CommonModule,
    GlassPanelComponent,
    MetricNumberComponent,
    SparklineComponent,
    RadialGaugeComponent,
    StatusDotComponent,
    HeatTileGridComponent,
    SkeletonShimmerComponent,
    EmptyStateComponent,
    MagneticHoverDirective
  ],
  template: `
    <div class="gallery-container">
      <header class="gallery-header">
        <h1 class="gallery-title">FLIGHT DECK COMPONENT GALLERY</h1>
        <p class="gallery-subtitle">Visual verification catalog for all 10 signature presentation components and buttons</p>
      </header>

      <!-- Section: Buttons -->
      <section class="gallery-section">
        <h2 class="section-title">BUTTONS & MAGNETIC HOVER</h2>
        <div class="demo-row">
          <button class="btn-primary" dpMagneticHover>Primary Gold Button</button>
          <button class="btn-secondary" dpMagneticHover>Secondary Glass Button</button>
          <button class="btn-destructive">Destructive Action</button>
          <button class="btn-secondary" (click)="openDangerDialog()">Open Danger Dialog</button>
        </div>
      </section>

      <!-- Section: Toasts -->
      <section class="gallery-section">
        <h2 class="section-title">TOAST NOTIFICATIONS</h2>
        <div class="demo-row">
          <button class="btn-secondary" (click)="triggerToast('info')">Trigger Info</button>
          <button class="btn-secondary" (click)="triggerToast('success')">Trigger Success</button>
          <button class="btn-secondary" (click)="triggerToast('warning')">Trigger Warning</button>
          <button class="btn-secondary" (click)="triggerToast('error')">Trigger Error</button>
        </div>
      </section>

      <!-- Section: Glass Panels -->
      <section class="gallery-section">
        <h2 class="section-title">GLASS PANELS & SPOTLIGHT</h2>
        <div class="grid-3">
          <dp-glass-panel [padding]="'16px'">
            <div class="panel-content">
              <h3>Standard Panel</h3>
              <p>Layered surface with 1px inner highlight and spotlight tracking.</p>
            </div>
          </dp-glass-panel>
          <dp-glass-panel [padding]="'16px'" [borderSweep]="true">
            <div class="panel-content">
              <h3>Border Sweep Panel</h3>
              <p>Animated border light pulse for active or focused telemetry cards.</p>
            </div>
          </dp-glass-panel>
          <dp-glass-panel [padding]="'16px'" [spotlight]="false">
            <div class="panel-content">
              <h3>Spotlight Disabled</h3>
              <p>Clean obsidian base without pointer spotlight reaction.</p>
            </div>
          </dp-glass-panel>
        </div>
      </section>

      <!-- Section: Status Dots -->
      <section class="gallery-section">
        <h2 class="section-title">STATUS DOTS</h2>
        <div class="demo-row">
          <div class="dot-preview"><dp-status-dot status="running"></dp-status-dot><span>running (pulsing)</span></div>
          <div class="dot-preview"><dp-status-dot status="stopped"></dp-status-dot><span>stopped</span></div>
          <div class="dot-preview"><dp-status-dot status="paused"></dp-status-dot><span>paused</span></div>
          <div class="dot-preview"><dp-status-dot status="restarting"></dp-status-dot><span>restarting (pulsing)</span></div>
          <div class="dot-preview"><dp-status-dot status="dead"></dp-status-dot><span>dead</span></div>
        </div>
      </section>

      <!-- Section: Metric Numbers -->
      <section class="gallery-section">
        <h2 class="section-title">METRIC NUMBERS (SPRING TWEENING)</h2>
        <div class="grid-4">
          <dp-glass-panel [padding]="'16px'">
            <div class="metric-card">
              <span class="metric-label">CPU LOAD</span>
              <dp-metric-number [value]="metricValue()" suffix="%" [warningThreshold]="70" [criticalThreshold]="90"></dp-metric-number>
            </div>
          </dp-glass-panel>
          <dp-glass-panel [padding]="'16px'">
            <div class="metric-card">
              <span class="metric-label">MEMORY USAGE</span>
              <dp-metric-number [value]="68.4" suffix="%" [delta]="2.3" [warningThreshold]="80" [criticalThreshold]="95"></dp-metric-number>
            </div>
          </dp-glass-panel>
          <dp-glass-panel [padding]="'16px'">
            <div class="metric-card">
              <span class="metric-label">ACTIVE CONTAINERS</span>
              <dp-metric-number [value]="42" [decimals]="0"></dp-metric-number>
            </div>
          </dp-glass-panel>
          <dp-glass-panel [padding]="'16px'">
            <div class="metric-card">
              <button class="btn-secondary" (click)="cycleMetric()">Randomize Value</button>
            </div>
          </dp-glass-panel>
        </div>
      </section>

      <!-- Section: Radial Gauges & Sparklines -->
      <section class="gallery-section">
        <h2 class="section-title">RADIAL GAUGES & SPARKLINES</h2>
        <div class="grid-2">
          <dp-glass-panel [padding]="'20px'">
            <div class="gauge-row">
              <dp-radial-gauge [value]="gaugeValue()" [size]="140" [strokeWidth]="8" label="CPU UTILIZATION"></dp-radial-gauge>
              <dp-radial-gauge [value]="88" [size]="140" [strokeWidth]="8" label="DISK CAPACITY" [criticalThreshold]="85"></dp-radial-gauge>
            </div>
          </dp-glass-panel>
          <dp-glass-panel [padding]="'20px'">
            <div class="sparkline-wrapper">
              <span class="metric-label">NETWORK I/O (KB/S)</span>
              <dp-sparkline [data]="sparklineData" [height]="64" strokeColor="var(--gold)"></dp-sparkline>
              <span class="metric-label">CONTAINER HEURISTICS</span>
              <dp-sparkline [data]="sparklineData2" [height]="64" strokeColor="var(--status-running)"></dp-sparkline>
            </div>
          </dp-glass-panel>
        </div>
      </section>

      <!-- Section: Heat Tiles Grid -->
      <section class="gallery-section">
        <h2 class="section-title">HEAT TILES (TELEMETRY CARDS)</h2>
        <dp-glass-panel [padding]="'20px'">
          <dp-heat-tile-grid [tiles]="heatTiles" (tileClick)="onTileClick($event)"></dp-heat-tile-grid>
        </dp-glass-panel>
      </section>

      <!-- Section: Skeleton Shimmers -->
      <section class="gallery-section">
        <h2 class="section-title">SKELETON SHIMMERS</h2>
        <div class="grid-2">
          <dp-glass-panel [padding]="'20px'">
            <h3>Card Skeleton</h3>
            <dp-skeleton-shimmer variant="card" [lines]="4"></dp-skeleton-shimmer>
          </dp-glass-panel>
          <dp-glass-panel [padding]="'20px'">
            <h3>Table Skeleton</h3>
            <dp-skeleton-shimmer variant="table" [lines]="5"></dp-skeleton-shimmer>
          </dp-glass-panel>
        </div>
      </section>

      <!-- Section: Empty States -->
      <section class="gallery-section">
        <h2 class="section-title">EMPTY STATES</h2>
        <div class="grid-2">
          <dp-glass-panel [padding]="'24px'">
            <dp-empty-state
              icon="search"
              title="No containers found"
              message="No running or stopped containers match your current filter parameters."
              actionLabel="Deploy Container"
              (action)="triggerToast('info')"
            ></dp-empty-state>
          </dp-glass-panel>
          <dp-glass-panel [padding]="'24px'">
            <dp-empty-state
              icon="terminal"
              title="No logs available"
              message="The selected service has not produced any stdout/stderr entries."
            ></dp-empty-state>
          </dp-glass-panel>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .gallery-container {
      padding: 32px 40px;
      max-width: 1400px;
      margin: 0 auto;
      color: var(--text-high);
      display: flex;
      flex-direction: column;
      gap: 36px;
    }

    .gallery-header {
      border-bottom: 1px solid var(--line-subtle);
      padding-bottom: 20px;
    }

    .gallery-title {
      font-size: 24px;
      letter-spacing: 0.08em;
      font-family: var(--font-display);
      color: var(--gold);
      margin: 0 0 6px 0;
    }

    .gallery-subtitle {
      font-size: 13px;
      color: var(--text-dim);
      margin: 0;
    }

    .gallery-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-title {
      font-size: 12px;
      font-family: var(--font-mono);
      letter-spacing: 0.12em;
      color: var(--text-medium);
      margin: 0;
      text-transform: uppercase;
    }

    .demo-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }

    @media (max-width: 900px) {
      .grid-2, .grid-3, .grid-4 {
        grid-template-columns: 1fr;
      }
    }

    .panel-content h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: var(--text-high);
    }

    .panel-content p {
      margin: 0;
      font-size: 12px;
      color: var(--text-dim);
    }

    .dot-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-medium);
      padding: 6px 12px;
      background: var(--bg-1);
      border-radius: var(--radius-sm);
      border: 1px solid var(--line-subtle);
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .metric-label {
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.08em;
      color: var(--text-dim);
    }

    .gauge-row {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }

    .sparkline-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `]
})
export class ComponentsGalleryComponent {
  private readonly dialog = inject(MatDialog);
  private readonly toastService = inject(ToastService);

  readonly metricValue = signal<number>(42.8);
  readonly gaugeValue = signal<number>(64);

  readonly sparklineData = [12, 18, 15, 24, 32, 28, 45, 52, 48, 62, 58, 74, 82, 79, 91];
  readonly sparklineData2 = [95, 90, 85, 80, 82, 70, 75, 60, 65, 55, 50, 48, 45, 42, 40];

  readonly heatTiles: HeatTileData[] = [
    { id: 'c1', name: 'api-gateway', cpuPercent: 18, memoryUsageMb: 240, status: 'running' },
    { id: 'c2', name: 'auth-service', cpuPercent: 35, memoryUsageMb: 180, status: 'running' },
    { id: 'c3', name: 'db-postgres', cpuPercent: 74, memoryUsageMb: 1200, status: 'warning' },
    { id: 'c4', name: 'worker-queue', cpuPercent: 92, memoryUsageMb: 640, status: 'critical' },
    { id: 'c5', name: 'cache-redis', cpuPercent: 12, memoryUsageMb: 95, status: 'running' },
    { id: 'c6', name: 'metric-collector', cpuPercent: 0, memoryUsageMb: 0, status: 'stopped' },
    { id: 'c7', name: 'backup-cron', cpuPercent: 5, memoryUsageMb: 45, status: 'running' },
    { id: 'c8', name: 'search-indexer', cpuPercent: 88, memoryUsageMb: 850, status: 'restarting' }
  ];

  cycleMetric(): void {
    this.metricValue.set(Math.floor(Math.random() * 100));
    this.gaugeValue.set(Math.floor(Math.random() * 100));
  }

  triggerToast(severity: 'info' | 'success' | 'warning' | 'error'): void {
    this.toastService.show({
      message: `Flight deck telemetry update: ${severity.toUpperCase()} state triggered`,
      severity,
      durationMs: 4000
    });
  }

  openDangerDialog(): void {
    this.dialog.open(ConfirmDangerDialogComponent, {
      data: {
        title: 'Prune All Stopped Containers',
        message: 'This will remove all stopped containers and reclaim storage. This action cannot be undone.',
        confirmKeyword: 'PRUNE'
      }
    });
  }

  onTileClick(tile: HeatTileData): void {
    this.toastService.show({
      message: `Selected tile: ${tile.name} (${tile.cpuPercent}%)`,
      severity: 'info',
      durationMs: 3000
    });
  }
}
