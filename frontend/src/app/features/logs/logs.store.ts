import { Injectable, computed, inject, signal } from '@angular/core';
import { ContainerSummary } from '../../core/models/container.model';
import { LogEntry } from '../../core/models/logs.model';
import { ContainersService } from '../../core/services/containers.service';
import { LogsService } from '../../core/services/logs.service';
import { ToastService } from '../../core/services/toast.service';

@Injectable()
export class LogsStore {
  private readonly logsService = inject(LogsService);
  private readonly containersService = inject(ContainersService);
  private readonly toast = inject(ToastService);

  // Signals
  readonly containers = signal<ContainerSummary[]>([]);
  readonly selectedContainerIds = signal<Set<string>>(new Set());
  readonly searchQuery = signal<string>('');
  readonly isRegex = signal<boolean>(false);
  readonly timeRange = signal<string>('1h');
  readonly levelFilter = signal<string>('ALL');
  readonly streamFilter = signal<string>('all');

  readonly rawLines = signal<LogEntry[]>([]);
  readonly loading = signal<boolean>(false);
  readonly bytesScanned = signal<number>(0);
  readonly isCapped = signal<boolean>(false);

  // Computeds
  readonly selectedCount = computed(() => this.selectedContainerIds().size);
  readonly allSelected = computed(() => {
    const list = this.containers();
    const sel = this.selectedContainerIds();
    return list.length > 0 && list.every((c) => sel.has(c.id));
  });

  readonly displayedLines = computed<LogEntry[]>(() => {
    let list = this.rawLines();
    const level = this.levelFilter();
    const stream = this.streamFilter();

    if (level !== 'ALL') {
      list = list.filter((l) => l.level === level);
    }
    if (stream !== 'all') {
      list = list.filter((l) => l.stream === stream);
    }
    return list;
  });

  loadContainers(): void {
    this.containersService.listContainers({ page_size: 100 }).subscribe({
      next: (res) => {
        this.containers.set(res.items);
        // Default select all containers
        const allIds = new Set(res.items.map((c) => c.id));
        this.selectedContainerIds.set(allIds);
        this.fetchLogs();
      },
      error: () => {
        this.toast.error('Failed to load containers');
      },
    });
  }

  toggleContainer(id: string): void {
    const updated = new Set(this.selectedContainerIds());
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    this.selectedContainerIds.set(updated);
    this.fetchLogs();
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedContainerIds.set(new Set());
    } else {
      this.selectedContainerIds.set(new Set(this.containers().map((c) => c.id)));
    }
    this.fetchLogs();
  }

  setTimeRange(range: string): void {
    this.timeRange.set(range);
    this.fetchLogs();
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  toggleRegex(): void {
    this.isRegex.set(!this.isRegex());
    this.fetchLogs();
  }

  setLevelFilter(lvl: string): void {
    this.levelFilter.set(lvl);
  }

  setStreamFilter(stream: string): void {
    this.streamFilter.set(stream);
  }

  fetchLogs(): void {
    const ids = Array.from(this.selectedContainerIds());
    if (ids.length === 0) {
      this.rawLines.set([]);
      this.bytesScanned.set(0);
      this.isCapped.set(false);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    let since: number | undefined;
    switch (this.timeRange()) {
      case '15m':
        since = now - 15 * 60;
        break;
      case '1h':
        since = now - 3600;
        break;
      case '6h':
        since = now - 6 * 3600;
        break;
      case '24h':
        since = now - 24 * 3600;
        break;
    }

    this.loading.set(true);
    this.logsService
      .searchLogs({
        container_ids: ids,
        q: this.searchQuery() || undefined,
        regex: this.isRegex(),
        since,
        tail: 500,
      })
      .subscribe({
        next: (res) => {
          this.rawLines.set(res.lines);
          this.bytesScanned.set(res.bytes_scanned);
          this.isCapped.set(res.capped);
          this.loading.set(false);
        },
        error: (err) => {
          this.toast.error(err?.error?.detail || 'Failed to search logs');
          this.loading.set(false);
        },
      });
  }
}
