import { Component, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { CONTAINER_STATE_COLORS, CONTAINER_STATE_LABELS, HOST_THRESHOLDS } from '../../core/constants/overview.constants';
import { EventsTimelineComponent } from '../events/components/events-timeline.component';
import { EventItem } from '../../core/models/events.model';

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
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly store = inject(DashboardStore);

  readonly stateColors = CONTAINER_STATE_COLORS;
  readonly stateLabels = CONTAINER_STATE_LABELS;
  readonly thresholds = HOST_THRESHOLDS;

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

  readonly donutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true
      }
    }
  };

  readonly barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true
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

  ngOnInit(): void {
    this.store.init();
  }

  ngOnDestroy(): void {
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

  formatLoadAvg(load: number[] | undefined): string {
    if (!load || load.length === 0) return 'N/A';
    return load.map((v) => v.toFixed(2)).join(', ');
  }
}
