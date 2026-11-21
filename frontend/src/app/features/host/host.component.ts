import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
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

  // Chart Configurations
  readonly chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
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
          borderColor: this.colors.cpuCore,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
          borderColor: this.colors.memory,
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          data: points.map((p) => Math.round(p.swap_bytes / (1024 * 1024))),
          label: 'Swap Used (MB)',
          borderColor: this.colors.swap,
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
          borderColor: this.colors.networkRx,
          fill: false,
          tension: 0.2,
        },
        {
          data: points.map((p) => Math.round(p.network_tx_bytes / 1024)),
          label: 'Tx (KB/s)',
          borderColor: this.colors.networkTx,
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
          borderColor: this.colors.diskRead,
          fill: false,
          tension: 0.2,
        },
        {
          data: points.map((p) => Math.round(p.disk_write_bytes / 1024)),
          label: 'Write (KB/s)',
          borderColor: this.colors.diskWrite,
          fill: false,
          tension: 0.2,
        },
      ],
    };
  });

  ngOnInit(): void {
    this.store.loadAll();
    this.store.startLivePolling();
  }

  ngOnDestroy(): void {
    this.store.destroy();
  }

  onRangeChange(range: string): void {
    this.store.setRange(range);
  }

  onSortChange(field: 'cpu' | 'memory'): void {
    this.store.setProcessSort(field);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
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
