import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, forkJoin, timer } from 'rxjs';
import {
  DockerDiskUsage,
  HostInfo,
  HostLiveMetrics,
  HostMetricPoint,
  HostProcessItem,
} from '../../core/models/host.model';
import { HostService } from '../../core/services/host.service';
import { HOST_METRICS_INTERVAL_MS, HOST_THRESHOLDS } from '../../core/constants/host.constants';

@Injectable()
export class HostStore {
  private readonly hostService = inject(HostService);
  private pollingSub: Subscription | null = null;

  // State Signals
  readonly hostInfo = signal<HostInfo | null>(null);
  readonly liveMetrics = signal<HostLiveMetrics | null>(null);
  readonly historyPoints = signal<HostMetricPoint[]>([]);
  readonly selectedRange = signal<string>('1h');
  readonly dockerUsage = signal<DockerDiskUsage | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly processSortField = signal<'cpu' | 'memory'>('cpu');

  // Computed Signals
  readonly cpuCores = computed<number[]>(() => {
    return this.liveMetrics()?.cpu.cores_percent || [];
  });

  readonly sortedProcesses = computed<HostProcessItem[]>(() => {
    const list = this.liveMetrics()?.top_processes || [];
    const field = this.processSortField();
    return [...list].sort((a, b) => {
      if (field === 'cpu') {
        return b.cpu_percent - a.cpu_percent;
      }
      return b.memory_percent - a.memory_percent;
    });
  });

  readonly mounts = computed(() => {
    const list = this.liveMetrics()?.mounts || [];
    return list.map((m) => ({
      ...m,
      isDiskWarning: m.percent >= HOST_THRESHOLDS.diskWarning && m.percent < HOST_THRESHOLDS.diskCritical,
      isDiskCritical: m.percent >= HOST_THRESHOLDS.diskCritical,
      isInodeWarning: m.inodes_percent >= HOST_THRESHOLDS.inodeWarning && m.inodes_percent < HOST_THRESHOLDS.inodeCritical,
      isInodeCritical: m.inodes_percent >= HOST_THRESHOLDS.inodeCritical,
    }));
  });

  loadAll(): void {
    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      info: this.hostService.getHostInfo(),
      live: this.hostService.getLiveMetrics(),
      history: this.hostService.getMetricsHistory(this.selectedRange()),
      docker: this.hostService.getDockerDiskUsage(),
    }).subscribe({
      next: ({ info, live, history, docker }) => {
        this.hostInfo.set(info);
        this.liveMetrics.set(live);
        this.historyPoints.set(history.points);
        this.dockerUsage.set(docker);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load host information');
        this.isLoading.set(false);
      },
    });
  }

  startLivePolling(): void {
    this.stopLivePolling();
    this.pollingSub = timer(HOST_METRICS_INTERVAL_MS, HOST_METRICS_INTERVAL_MS).subscribe(() => {
      this.hostService.getLiveMetrics().subscribe({
        next: (metrics) => this.liveMetrics.set(metrics),
        error: () => {
          // Keep prior snapshot silently on background polling errors
        },
      });
    });
  }

  stopLivePolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
  }

  setRange(range: string): void {
    this.selectedRange.set(range);
    this.hostService.getMetricsHistory(range).subscribe({
      next: (resp) => this.historyPoints.set(resp.points),
      error: (err) => this.error.set(err?.message || 'Failed to load metrics history'),
    });
  }

  setProcessSort(field: 'cpu' | 'memory'): void {
    this.processSortField.set(field);
  }

  refreshDockerUsage(): void {
    this.hostService.getDockerDiskUsage().subscribe({
      next: (usage) => this.dockerUsage.set(usage),
    });
  }

  destroy(): void {
    this.stopLivePolling();
  }
}
