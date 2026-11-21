import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ContainerDetail,
  ContainerLiveStats,
  DetailTabType,
} from '../../../core/models/container-detail.model';
import { MetricRange } from '../../../core/constants/container.constants';
import { ContainersDetailService } from '../../../core/services/container-detail.service';
import { ToastService } from '../../../core/services/toast.service';

@Injectable()
export class ContainerDetailStore {
  private readonly service = inject(ContainersDetailService);
  private readonly toast = inject(ToastService);
  private statsSub: Subscription | null = null;

  // Signals
  readonly containerId = signal<string | null>(null);
  readonly detail = signal<ContainerDetail | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<DetailTabType>('overview');
  readonly liveStats = signal<ContainerLiveStats | null>(null);
  readonly metricsRange = signal<MetricRange>('1h');
  readonly metricsHistory = signal<ContainerLiveStats[]>([]);
  readonly metricsLoading = signal<boolean>(false);
  readonly envRevealed = signal<boolean>(false);
  readonly actionInProgress = signal<boolean>(false);

  // Computeds
  readonly state = computed(() => this.detail()?.state ?? 'unknown');
  readonly status = computed(() => this.detail()?.status ?? '');
  readonly health = computed(() => this.detail()?.health ?? 'none');
  readonly cpuPercent = computed(() => this.liveStats()?.cpu_percent ?? 0);
  readonly memoryBytes = computed(() => this.liveStats()?.memory_bytes ?? 0);
  readonly memoryLimit = computed(() => this.liveStats()?.memory_limit ?? 0);
  readonly memoryPercent = computed(() => this.liveStats()?.memory_percent ?? 0);
  readonly netRxBytes = computed(() => this.liveStats()?.net_rx_bytes ?? 0);
  readonly netTxBytes = computed(() => this.liveStats()?.net_tx_bytes ?? 0);
  readonly blockReadBytes = computed(() => this.liveStats()?.block_read_bytes ?? 0);
  readonly blockWriteBytes = computed(() => this.liveStats()?.block_write_bytes ?? 0);

  loadContainer(id: string): void {
    this.containerId.set(id);
    this.loading.set(true);
    this.error.set(null);
    this.envRevealed.set(false);

    this.service.getContainerDetail(id).subscribe({
      next: (data) => {
        this.detail.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.message || 'Failed to load container details');
        this.loading.set(false);
      },
    });

    this.startStatsStream(id);
    this.loadMetricsHistory(id, this.metricsRange());
  }

  setTab(tab: DetailTabType): void {
    this.activeTab.set(tab);
  }

  setMetricsRange(range: MetricRange): void {
    this.metricsRange.set(range);
    const id = this.containerId();
    if (id) {
      this.loadMetricsHistory(id, range);
    }
  }

  loadMetricsHistory(id: string, range: string): void {
    this.metricsLoading.set(true);
    this.service.getMetricsHistory(id, range).subscribe({
      next: (res) => {
        this.metricsHistory.set(res.points);
        this.metricsLoading.set(false);
      },
      error: () => {
        this.metricsLoading.set(false);
      },
    });
  }

  startStatsStream(id: string): void {
    this.statsSub?.unsubscribe();
    this.statsSub = this.service.getStatsStream(id).subscribe({
      next: (stats) => {
        this.liveStats.set(stats);
      },
      error: () => {
        // SSE disconnected, silently handle
      },
    });
  }

  revealSecrets(): void {
    const id = this.containerId();
    if (!id) return;

    this.service.revealEnv(id).subscribe({
      next: (res) => {
        const cur = this.detail();
        if (cur) {
          this.detail.set({ ...cur, env: res.env });
        }
        this.envRevealed.set(true);
        this.toast.success('Environment variables revealed');
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || 'Failed to reveal secrets');
      },
    });
  }

  executeAction(action: string): void {
    const id = this.containerId();
    if (!id) return;

    this.actionInProgress.set(true);
    this.service.executeAction(id, action).subscribe({
      next: (res) => {
        this.toast.success(res.message || `Action ${action} completed`);
        this.actionInProgress.set(false);
        // Refresh details after action
        this.service.getContainerDetail(id).subscribe({
          next: (data) => this.detail.set(data),
        });
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || `Failed to execute ${action}`);
        this.actionInProgress.set(false);
      },
    });
  }

  destroy(): void {
    this.statsSub?.unsubscribe();
    this.statsSub = null;
  }
}
