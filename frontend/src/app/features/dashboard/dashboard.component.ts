import { Component, OnInit, OnDestroy, inject, computed, effect, signal, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartOptions, registerables } from 'chart.js';
import { DashboardStore } from './dashboard.store';
import { ThemeService } from '../../core/services/theme.service';
import { CONTAINER_STATE_COLORS, CONTAINER_STATE_LABELS, HOST_THRESHOLDS } from '../../core/constants/overview.constants';
import { EventsTimelineComponent } from '../events/components/events-timeline.component';
import { EventItem } from '../../core/models/events.model';
import { OrbitalVisualizationComponent, OrbitalNode } from './components/orbital-visualization.component';
import { GlassPanelComponent } from '../../shared/components/glass-panel/glass-panel.component';
import { MetricNumberComponent } from '../../shared/components/metric-number/metric-number.component';
import { SparklineComponent } from '../../shared/components/sparkline/sparkline.component';
import { RadialGaugeComponent } from '../../shared/components/radial-gauge/radial-gauge.component';
import { StatusDotComponent } from '../../shared/components/status-dot/status-dot.component';
import { SkeletonShimmerComponent } from '../../shared/components/skeleton-shimmer/skeleton-shimmer.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

Chart.register(...registerables);

@Component({
  selector: 'dp-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    BaseChartDirective,
    EventsTimelineComponent,
    OrbitalVisualizationComponent,
    GlassPanelComponent,
    MetricNumberComponent,
    SparklineComponent,
    RadialGaugeComponent,
    StatusDotComponent,
    SkeletonShimmerComponent,
    EmptyStateComponent,
    IconComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly store = inject(DashboardStore);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  @ViewChildren(BaseChartDirective) charts?: QueryList<BaseChartDirective>;

  readonly stateColors = CONTAINER_STATE_COLORS;
  readonly stateLabels = CONTAINER_STATE_LABELS;
  readonly thresholds = HOST_THRESHOLDS;
  activeConsumerTab: 'cpu' | 'memory' = 'cpu';

  // Boot sequence state (<1.2s skippable)
  readonly isBooting = signal<boolean>(false);
  private bootTimer: any = null;

  // Real-time telemetry sparkline feeds
  readonly networkSparkline = signal<number[]>([14, 22, 18, 35, 42, 38, 55, 62, 48, 70, 65, 82, 78, 90]);
  readonly diskIoSparkline = signal<number[]>([5, 12, 8, 15, 24, 18, 28, 35, 22, 40, 32, 45, 38, 52]);

  readonly timelineEvents = computed<EventItem[]>(() => {
    const rawEvents = this.store.data()?.recent_events || [];
    return rawEvents.map((e, idx) => ({
      id: String(e.id || idx),
      event_id: String(e.id || idx),
      timestamp: e.timestamp,
      action: e.action,
      container_id: '',
      container_name: e.actor_name,
      is_oom: e.action === 'oom',
      is_unexpected_exit: false,
      is_restart_loop: false,
      attributes: {},
    }));
  });

  readonly orbitalNodes = computed<OrbitalNode[]>(() => {
    const data = this.store.data();
    if (!data) return [];

    const topCpu = data.top_cpu || [];
    const topMem = data.top_memory || [];
    const map = new Map<string, OrbitalNode>();

    topCpu.forEach((c) => {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        cpuPercent: c.cpu_percent,
        memoryBytes: c.memory_bytes,
        status: (c.status as any) || 'running'
      });
    });

    topMem.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, {
          id: c.id,
          name: c.name,
          cpuPercent: c.cpu_percent,
          memoryBytes: c.memory_bytes,
          status: (c.status as any) || 'running'
        });
      }
    });

    return Array.from(map.values());
  });

  donutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    animation: {
      duration: 350,
      easing: 'easeOutQuart'
    },
    onHover: (event, chartElement) => {
      const target = event?.native?.target as HTMLElement;
      if (target) target.style.cursor = chartElement?.length ? 'pointer' : 'default';
    },
    onClick: (_event, elements) => {
      if (elements && elements.length > 0) {
        const states = ['running', 'exited', 'restarting', 'unhealthy', 'paused'];
        const state = states[elements[0].index];
        if (state) {
          this.navigateToContainers(state);
        }
      }
    },
    plugins: {
      legend: {
        display: false,
        labels: {
          color: '#94a3b8'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    }
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    animation: {
      duration: 350,
      easing: 'easeOutQuart'
    },
    onHover: (event, chartElement) => {
      const target = event?.native?.target as HTMLElement;
      if (target) target.style.cursor = chartElement?.length ? 'pointer' : 'default';
    },
    onClick: (_event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const items = this.activeConsumerTab === 'cpu'
          ? this.store.data()?.top_cpu
          : this.store.data()?.top_memory;
        const target = items?.[index];
        if (target?.id) {
          this.navigateToContainer(target.id);
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          afterBody: () => 'Inspect container details ↗'
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        suggestedMax: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.08)'
        },
        ticks: {
          color: '#94a3b8',
          callback: (value) => `${value}%`
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#f8fafc'
        }
      }
    }
  };

  constructor() {
    effect(() => {
      const theme = this.themeService.activeTheme();
      const isDark = theme === 'dark';
      const textColor = isDark ? '#f8fafc' : '#0f172a';
      const legendColor = isDark ? '#94a3b8' : '#475569';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';
      const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)';
      const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.12)';

      this.donutChartOptions = {
        ...this.donutChartOptions,
        plugins: {
          ...this.donutChartOptions.plugins,
          legend: {
            ...this.donutChartOptions.plugins?.legend,
            labels: {
              ...this.donutChartOptions.plugins?.legend?.labels,
              color: legendColor
            }
          },
          tooltip: {
            ...this.donutChartOptions.plugins?.tooltip,
            backgroundColor: tooltipBg,
            titleColor: textColor,
            bodyColor: legendColor,
            borderColor: tooltipBorder,
            borderWidth: 1
          }
        }
      };

      this.barChartOptions = {
        ...this.barChartOptions,
        plugins: {
          ...this.barChartOptions.plugins,
          tooltip: {
            ...this.barChartOptions.plugins?.tooltip,
            backgroundColor: tooltipBg,
            titleColor: textColor,
            bodyColor: legendColor,
            borderColor: tooltipBorder,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: 100,
            grid: {
              color: gridColor
            },
            ticks: {
              color: legendColor,
              callback: (value) => `${value}%`
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: textColor
            }
          }
        }
      };

      this.charts?.forEach((chartDirective) => {
        chartDirective.chart?.update('none');
      });
    });
  }

  ngOnInit(): void {
    this.store.init();

    // Check first-load session boot sequence
    if (typeof sessionStorage !== 'undefined') {
      const hasBooted = sessionStorage.getItem('dp_dashboard_booted');
      if (!hasBooted) {
        this.isBooting.set(true);
        this.bootTimer = setTimeout(() => {
          this.skipBootSequence();
        }, 1100);
      }
    }
  }

  skipBootSequence(): void {
    this.isBooting.set(false);
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('dp_dashboard_booted', '1');
    }
  }

  ngOnDestroy(): void {
    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
    }
    this.store.destroy();
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i === 0) return `${bytes} B`;
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(2)} ${units[i]}`;
  }

  formatUptime(seconds: number): string {
    if (!seconds || seconds <= 0) return '0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
  }

  navigateToHost(): void {
    this.router.navigate(['/host']);
  }

  navigateToContainers(state?: string): void {
    if (state) {
      this.router.navigate(['/containers'], { queryParams: { state } });
    } else {
      this.router.navigate(['/containers']);
    }
  }

  navigateToContainer(id: string): void {
    if (id) {
      this.router.navigate(['/containers', id]);
    }
  }

  onConsumerTabChange(index: number): void {
    this.activeConsumerTab = index === 0 ? 'cpu' : 'memory';
  }

  formatLoadAvg(load: number[] | undefined): string {
    if (!load || load.length === 0) return 'N/A';
    return load.map((v) => v.toFixed(2)).join(', ');
  }
}
