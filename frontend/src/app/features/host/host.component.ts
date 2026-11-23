import { Component, OnInit, OnDestroy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';

import { HostStore } from './host.store';
import { HOST_COLORS, HOST_HISTORY_RANGES, HOST_THRESHOLDS } from '../../core/constants/host.constants';
import { RadialGaugeComponent } from '../../shared/components/radial-gauge/radial-gauge.component';
import { MetricNumberComponent } from '../../shared/components/metric-number/metric-number.component';
import { GlassPanelComponent } from '../../shared/components/glass-panel/glass-panel.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

Chart.register(...registerables);

@Component({
  selector: 'dp-host',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    RadialGaugeComponent,
    MetricNumberComponent,
    GlassPanelComponent,
    IconComponent
  ],
  providers: [HostStore],
  templateUrl: './host.component.html',
  styleUrls: ['./host.component.scss'],
})
export class HostComponent implements OnInit, OnDestroy {
  readonly store = inject(HostStore);
  readonly ranges = HOST_HISTORY_RANGES;
  readonly thresholds = HOST_THRESHOLDS;
  readonly colors = HOST_COLORS;

  readonly processColumns = ['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'memory_rss', 'status'];

  // Mission Elapsed Time Ticking Counter
  readonly uptimeClock = signal<string>('00:00:00');
  private uptimeTimer: any = null;
  private currentUptimeSeconds = 86400 * 3 + 3600 * 5; // fallback

  // Three-needle load angles computed
  readonly loadAngles = computed(() => {
    const live = this.store.liveMetrics();
    const l1 = live?.load_1m ?? 0.5;
    const l5 = live?.load_5m ?? 0.4;
    const l15 = live?.load_15m ?? 0.3;
    const maxVal = Math.max(4, l1, l5, l15);

    // Map to gauge dial angle (-120deg to +120deg)
    return {
      angle1: -120 + (Math.min(l1, maxVal) / maxVal) * 240,
      angle5: -120 + (Math.min(l5, maxVal) / maxVal) * 240,
      angle15: -120 + (Math.min(l15, maxVal) / maxVal) * 240,
      l1,
      l5,
      l15
    };
  });

  // Chart Configurations
  readonly chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, color: '#94a3b8' } },
      tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(6, 6, 9, 0.92)', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
      y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
    },
  };

  readonly cpuChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.store.historyPoints();
    const labels = points.map((p) => this.formatTime(p.timestamp));
    return {
      labels,
      datasets: [
        {
          data: points.map((p) => p.cpu_percent),
          label: 'CPU %',
          borderColor: '#D4AF37',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  });

  readonly memoryChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.store.historyPoints();
    const labels = points.map((p) => this.formatTime(p.timestamp));
    return {
      labels,
      datasets: [
        {
          data: points.map((p) => Math.round(p.memory_bytes / (1024 * 1024))),
          label: 'RAM Used (MB)',
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          data: points.map((p) => Math.round(p.swap_bytes / (1024 * 1024))),
          label: 'Swap Used (MB)',
          borderColor: '#F59E0B',
          fill: false,
          tension: 0.3,
        },
      ],
    };
  });

  readonly networkChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.store.historyPoints();
    const labels = points.map((p) => this.formatTime(p.timestamp));
    return {
      labels,
      datasets: [
        {
          data: points.map((p) => Math.round(p.network_rx_bytes / 1024)),
          label: 'Rx (KB/s)',
          borderColor: '#34D399',
          fill: false,
          tension: 0.2,
        },
        {
          data: points.map((p) => Math.round(p.network_tx_bytes / 1024)),
          label: 'Tx (KB/s)',
          borderColor: '#38BDF8',
          fill: false,
          tension: 0.2,
        },
      ],
    };
  });

  readonly diskIoChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.store.historyPoints();
    const labels = points.map((p) => this.formatTime(p.timestamp));
    return {
      labels,
      datasets: [
        {
          data: points.map((p) => Math.round(p.disk_read_bytes / 1024)),
          label: 'Read (KB/s)',
          borderColor: '#F59E0B',
          fill: false,
          tension: 0.2,
        },
        {
          data: points.map((p) => Math.round(p.disk_write_bytes / 1024)),
          label: 'Write (KB/s)',
          borderColor: '#F43F5E',
          fill: false,
          tension: 0.2,
        },
      ],
    };
  });

  ngOnInit(): void {
    this.store.loadAll();
    this.store.startLivePolling();

    // Start ticking uptime counter
    this.updateUptimeString();
    this.uptimeTimer = setInterval(() => {
      this.currentUptimeSeconds++;
      this.updateUptimeString();
    }, 1000);
  }

  private updateUptimeString(): void {
    const days = Math.floor(this.currentUptimeSeconds / 86400);
    const hours = Math.floor((this.currentUptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((this.currentUptimeSeconds % 3600) / 60);
    const seconds = this.currentUptimeSeconds % 60;
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    this.uptimeClock.set(`${days}d ${hh}:${mm}:${ss}`);
  }

  ngOnDestroy(): void {
    if (this.uptimeTimer) {
      clearInterval(this.uptimeTimer);
    }
    this.store.destroy();
  }

  onRangeChange(range: string): void {
    this.store.setRange(range);
  }

  onSortChange(field: 'cpu' | 'memory'): void {
    this.store.setProcessSort(field);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getCoreColorClass(pct: number): string {
    if (pct >= this.thresholds.cpuCritical) return 'critical';
    if (pct >= this.thresholds.cpuWarning) return 'warning';
    return 'normal';
  }

  private formatTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
