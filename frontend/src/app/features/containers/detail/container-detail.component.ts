import { Component, OnInit, OnDestroy, inject, computed, signal, effect, ViewChildren, QueryList } from '@angular/core';
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
import { EventsService } from '../../../core/services/events.service';
import { ThemeService } from '../../../core/services/theme.service';
import { EventsTimelineComponent } from '../../events/components/events-timeline.component';
import { EventItem } from '../../../core/models/events.model';
import { ActionConfirmDialogComponent } from '../dialogs/action-confirm-dialog.component';
import { DeleteContainerDialogComponent } from '../dialogs/delete-container-dialog.component';
import { LogViewerComponent } from '../../../shared/components/log-viewer/log-viewer.component';
import { ContainerTerminalComponent } from '../terminal/container-terminal.component';
import { METRIC_RANGES, MetricRange } from '../../../core/constants/container.constants';
import { DetailTabType, ContainerDetail } from '../../../core/models/container-detail.model';
import { RadialGaugeComponent } from '../../../shared/components/radial-gauge/radial-gauge.component';
import { MetricNumberComponent } from '../../../shared/components/metric-number/metric-number.component';
import { GlassPanelComponent } from '../../../shared/components/glass-panel/glass-panel.component';
import { StatusDotComponent } from '../../../shared/components/status-dot/status-dot.component';
import { SkeletonShimmerComponent } from '../../../shared/components/skeleton-shimmer/skeleton-shimmer.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { MagneticHoverDirective } from '../../../shared/directives/magnetic-hover.directive';

Chart.register(...registerables);

const TABS: DetailTabType[] = ['overview', 'metrics', 'logs', 'config', 'events', 'terminal'];

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
    EventsTimelineComponent,
    ContainerTerminalComponent,
    RadialGaugeComponent,
    MetricNumberComponent,
    GlassPanelComponent,
    StatusDotComponent,
    SkeletonShimmerComponent,
    EmptyStateComponent,
    IconComponent,
    MagneticHoverDirective
  ],
  providers: [ContainerDetailStore],
  templateUrl: './container-detail.component.html',
  styleUrls: ['./container-detail.component.scss'],
})
export class ContainerDetailComponent implements OnInit, OnDestroy {
  readonly store = inject(ContainerDetailStore);
  private readonly authService = inject(AuthService);
  private readonly eventsService = inject(EventsService, { optional: true });
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  readonly themeService = inject(ThemeService);

  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;

  readonly containerEvents = signal<EventItem[]>([]);

  private querySub: Subscription | null = null;
  readonly metricRanges = METRIC_RANGES;

  readonly canOperate = computed(() => this.authService.hasRole('operator'));
  readonly canAdmin = computed(() => this.authService.hasRole('admin'));

  readonly availableTabs = computed(() => {
    return this.canAdmin()
      ? (['overview', 'metrics', 'logs', 'config', 'events', 'terminal'] as DetailTabType[])
      : (['overview', 'metrics', 'logs', 'config', 'events'] as DetailTabType[]);
  });

  readonly selectedTabIndex = computed(() => {
    const tab = this.store.activeTab();
    const idx = this.availableTabs().indexOf(tab);
    return idx >= 0 ? idx : 0;
  });

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#94a3b8',
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          color: 'rgba(255, 255, 255, 0.06)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.06)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
  };

  constructor() {
    effect(() => {
      const theme = this.themeService.activeTheme();
      const isDark = theme === 'dark';
      const textColor = isDark ? '#f8fafc' : '#0f172a';
      const tickColor = isDark ? '#94a3b8' : '#475569';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)';
      const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)';
      const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)';

      this.lineChartOptions = {
        ...this.lineChartOptions,
        plugins: {
          ...this.lineChartOptions.plugins,
          legend: {
            ...this.lineChartOptions.plugins?.legend,
            labels: {
              ...this.lineChartOptions.plugins?.legend?.labels,
              color: tickColor,
            },
          },
          tooltip: {
            ...this.lineChartOptions.plugins?.tooltip,
            backgroundColor: tooltipBg,
            titleColor: textColor,
            bodyColor: tickColor,
            borderColor: tooltipBorder,
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
              color: gridColor,
            },
            ticks: {
              color: tickColor,
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor,
            },
            ticks: {
              color: tickColor,
            },
          },
        },
      };

      this.charts?.forEach((chartDirective) => {
        chartDirective.chart?.update('none');
      });
    });
  }

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
          borderColor: '#D4AF37',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          fill: true,
          tension: 0.35,
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
    return {
      labels,
      datasets: [
        {
          data: points.map((p) => p.memory_bytes / 1048576),
          label: 'Memory (MB)',
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.35,
        },
      ],
    };
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
          data: points.map((p) => p.net_rx_bytes / 1024),
          label: 'Net Rx (KB)',
          borderColor: '#34D399',
          tension: 0.35,
        },
        {
          data: points.map((p) => p.net_tx_bytes / 1024),
          label: 'Net Tx (KB)',
          borderColor: '#38BDF8',
          tension: 0.35,
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
          data: points.map((p) => p.block_read_bytes / 1024),
          label: 'Block Read (KB)',
          borderColor: '#F59E0B',
          tension: 0.35,
        },
        {
          data: points.map((p) => p.block_write_bytes / 1024),
          label: 'Block Write (KB)',
          borderColor: '#F43F5E',
          tension: 0.35,
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
      if (tabParam && this.availableTabs().includes(tabParam)) {
        this.store.setTab(tabParam);
      }
    });
  }

  loadContainerEvents(id: string): void {
    this.eventsService?.getEvents({ container_id: id, limit: 50 }).subscribe({
      next: (resp) => this.containerEvents.set(resp.items),
      error: () => {},
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    this.store.destroy();
  }

  onTabChange(index: number): void {
    const tab = this.availableTabs()[index] || 'overview';
    this.store.setTab(tab);
    if (tab === 'events') {
      const id = this.store.containerId();
      if (id) this.loadContainerEvents(id);
    }
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

  navigateToContainers(): void {
    this.router.navigate(['/containers']);
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
