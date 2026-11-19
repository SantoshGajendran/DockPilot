import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChartData } from 'chart.js';
import { OverviewService } from '../../core/services/overview.service';
import { OverviewResponse } from '../../core/models/overview.model';
import {
  CONTAINER_STATE_LABELS,
  CONTAINER_STATE_COLORS,
  DASHBOARD_CONSTANTS
} from '../../core/constants/overview.constants';

@Injectable({ providedIn: 'root' })
export class DashboardStore implements OnDestroy {
  private readonly overviewService = inject(OverviewService);

  // State Signals
  readonly data = signal<OverviewResponse | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isStale = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly lastReceivedAt = signal<number>(0);

  // Computed Signals
  readonly hasContainers = computed<boolean>(() => (this.data()?.containers.total ?? 0) > 0);

  readonly containerStateChartData = computed<ChartData<'doughnut'>>(() => {
    const containers = this.data()?.containers;
    return {
      labels: [
        CONTAINER_STATE_LABELS.running,
        CONTAINER_STATE_LABELS.exited,
        CONTAINER_STATE_LABELS.restarting,
        CONTAINER_STATE_LABELS.unhealthy,
        CONTAINER_STATE_LABELS.paused
      ],
      datasets: [
        {
          data: [
            containers?.running ?? 0,
            containers?.exited ?? 0,
            containers?.restarting ?? 0,
            containers?.unhealthy ?? 0,
            containers?.paused ?? 0
          ],
          backgroundColor: [
            CONTAINER_STATE_COLORS.running,
            CONTAINER_STATE_COLORS.exited,
            CONTAINER_STATE_COLORS.restarting,
            CONTAINER_STATE_COLORS.unhealthy,
            CONTAINER_STATE_COLORS.paused
          ],
          borderWidth: 0
        }
      ]
    };
  });

  readonly topCpuChartData = computed<ChartData<'bar'>>(() => {
    const items = this.data()?.top_cpu ?? [];
    return {
      labels: items.map((c) => c.name),
      datasets: [
        {
          label: 'CPU %',
          data: items.map((c) => c.cpu_percent),
          backgroundColor: DASHBOARD_CONSTANTS.topCpuColor
        }
      ]
    };
  });

  readonly topMemoryChartData = computed<ChartData<'bar'>>(() => {
    const items = this.data()?.top_memory ?? [];
    return {
      labels: items.map((c) => c.name),
      datasets: [
        {
          label: 'Memory %',
          data: items.map((c) => c.memory_percent),
          backgroundColor: DASHBOARD_CONSTANTS.topMemoryColor
        }
      ]
    };
  });

  private snapshotSub: Subscription | null = null;
  private streamSub: Subscription | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;

  init(): void {
    this.destroy();
    this.isLoading.set(true);
    this.error.set(null);

    // Initial HTTP snapshot
    this.snapshotSub = this.overviewService.getOverview().subscribe({
      next: (res) => {
        this.handleOverviewUpdate(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Failed to load overview data');
        this.isLoading.set(false);
      }
    });

    // Real-time SSE stream
    this.streamSub = this.overviewService.getOverviewStream().subscribe({
      next: (res) => {
        this.handleOverviewUpdate(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Overview stream error');
      }
    });

    // Watchdog timer for missed heartbeats
    this.startWatchdog();
  }

  destroy(): void {
    if (this.snapshotSub) {
      this.snapshotSub.unsubscribe();
      this.snapshotSub = null;
    }
    if (this.streamSub) {
      this.streamSub.unsubscribe();
      this.streamSub = null;
    }
    this.stopWatchdog();
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  private handleOverviewUpdate(res: OverviewResponse): void {
    this.data.set(res);
    this.lastReceivedAt.set(Date.now());
    this.isStale.set(false);
    this.error.set(null);
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      const last = this.lastReceivedAt();
      if (last > 0 && Date.now() - last >= DASHBOARD_CONSTANTS.staleThresholdMs) {
        this.isStale.set(true);
      }
    }, DASHBOARD_CONSTANTS.watchdogIntervalMs);
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer !== null) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }
}
