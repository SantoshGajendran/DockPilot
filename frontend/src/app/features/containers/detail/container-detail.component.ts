import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

import { ContainerDetailStore } from './container-detail.store';
import { AuthService } from '../../../core/services/auth.service';
import { ActionConfirmDialogComponent } from '../dialogs/action-confirm-dialog.component';
import { DeleteContainerDialogComponent } from '../dialogs/delete-container-dialog.component';
import { LogViewerComponent } from '../../../shared/components/log-viewer/log-viewer.component';
import { METRIC_RANGES, MetricRange } from '../../../core/constants/container.constants';
import { DetailTabType, ContainerDetail } from '../../../core/models/container-detail.model';

Chart.register(...registerables);

const TABS: DetailTabType[] = ['overview', 'metrics', 'logs', 'config', 'events'];

@Component({
  selector: 'dp-container-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    BaseChartDirective,
    LogViewerComponent,
  ],

  providers: [ContainerDetailStore],
  templateUrl: './container-detail.component.html',
  styleUrls: ['./container-detail.component.scss'],
})
export class ContainerDetailComponent implements OnInit, OnDestroy {
  readonly store = inject(ContainerDetailStore);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private querySub: Subscription | null = null;
  readonly metricRanges = METRIC_RANGES;

  readonly canOperate = computed(() => this.authService.hasRole('operator'));
  readonly canAdmin = computed(() => this.authService.hasRole('admin'));

  readonly selectedTabIndex = computed(() => {
    const tab = this.store.activeTab();
    const idx = TABS.indexOf(tab);
    return idx >= 0 ? idx : 0;
  });

  readonly lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: { enabled: true },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  readonly cpuChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.store.metricsHistory();
    const labels = points.map((p) => {
      const d = new Date(p.timestamp);
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    return {
      labels,
      datasets: [
        {
          data: points.map((p) => p.cpu_percent),
          label: 'CPU %',
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  });

  readonly memoryChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.store.metricsHistory();
    const labels = points.map((p) => {
      const d = new Date(p.timestamp);
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    const datasets: any[] = [
      {
        data: points.map((p) => Math.round(p.memory_bytes / (1024 * 1024))),
        label: 'Used (MB)',
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ];

    if (points.length > 0 && points[0].memory_limit > 0) {
      datasets.push({
        data: points.map((p) => Math.round(p.memory_limit / (1024 * 1024))),
        label: 'Limit (MB)',
        borderColor: '#ef4444',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
      });
    }

    return { labels, datasets };
  });

  readonly netChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.store.metricsHistory();
    const labels = points.map((p) => {
      const d = new Date(p.timestamp);
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    return {
      labels,
      datasets: [
        {
          data: points.map((p) => Math.round(p.net_rx_bytes / 1024)),
          label: 'Rx (KB)',
          borderColor: '#10b981',
          fill: false,
        },
        {
          data: points.map((p) => Math.round(p.net_tx_bytes / 1024)),
          label: 'Tx (KB)',
          borderColor: '#6366f1',
          fill: false,
        },
      ],
    };
  });

  readonly blockChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const points = this.store.metricsHistory();
    const labels = points.map((p) => {
      const d = new Date(p.timestamp);
      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    return {
      labels,
      datasets: [
        {
          data: points.map((p) => Math.round(p.block_read_bytes / 1024)),
          label: 'Read (KB)',
          borderColor: '#f59e0b',
          fill: false,
        },
        {
          data: points.map((p) => Math.round(p.block_write_bytes / 1024)),
          label: 'Write (KB)',
          borderColor: '#ec4899',
          fill: false,
        },
      ],
    };
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.store.loadContainer(id);
    }

    this.querySub = this.route.queryParams.subscribe((params) => {
      const tabParam = params['tab'] as DetailTabType | undefined;
      if (tabParam && TABS.includes(tabParam)) {
        this.store.setTab(tabParam);
      }
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    this.store.destroy();
  }

  onTabChange(index: number): void {
    const tab = TABS[index] || 'overview';
    this.store.setTab(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  onRangeChange(range: MetricRange): void {
    if (range) {
      this.store.setMetricsRange(range);
    }
  }

  reload(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.store.loadContainer(id);
    }
  }

  confirmAction(action: string): void {
    const detail = this.store.detail();
    if (!detail) return;

    const dialogRef = this.dialog.open(ActionConfirmDialogComponent, {
      width: '420px',
      data: { action, containerName: detail.name },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.executeAction(action);
      }
    });
  }

  openDeleteDialog(detail: ContainerDetail): void {
    const dialogRef = this.dialog.open(DeleteContainerDialogComponent, {
      width: '450px',
      data: { containerId: detail.id, containerName: detail.name },
    });

    dialogRef.afterClosed().subscribe((deleted) => {
      if (deleted) {
        this.router.navigate(['/containers']);
      }
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  hasLabels(labels: Record<string, string>): boolean {
    return !!labels && Object.keys(labels).length > 0;
  }

  getLabelsList(labels: Record<string, string>): { key: string; val: string }[] {
    if (!labels) return [];
    return Object.entries(labels).map(([key, val]) => ({ key, val }));
  }
}
