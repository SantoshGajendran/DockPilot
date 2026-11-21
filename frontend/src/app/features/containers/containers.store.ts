import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ContainerFilterParams,
  ContainerLiveMetrics,
  ContainerSummary,
} from '../../core/models/container.model';
import { ContainersService } from '../../core/services/containers.service';
import { ToastService } from '../../core/services/toast.service';
import {
  CONTAINER_FILTER_STORAGE_KEY,
  DEFAULT_CONTAINER_PRESETS,
} from '../../core/constants/container.constants';

export interface FilterPreset {
  name: string;
  filters: {
    q?: string;
    state?: string;
    health?: string;
    compose_project?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ContainersStore {
  private readonly containersService = inject(ContainersService);
  private readonly toast = inject(ToastService);
  private streamSub: Subscription | null = null;

  // Signals
  readonly containers = signal<ContainerSummary[]>([]);
  readonly total = signal<number>(0);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly totalPages = signal<number>(1);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly sortBy = signal<string>('name');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');

  readonly filters = signal<{
    q: string;
    state: string;
    health: string;
    compose_project: string;
  }>({
    q: '',
    state: '',
    health: '',
    compose_project: '',
  });

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly liveMetrics = signal<Map<string, ContainerLiveMetrics>>(new Map());
  readonly presets = signal<FilterPreset[]>([]);

  // Computed
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allSelected = computed(() => {
    const list = this.containers();
    const sel = this.selectedIds();
    return list.length > 0 && list.every(c => sel.has(c.id));
  });
  readonly isIndeterminate = computed(() => {
    const list = this.containers();
    const sel = this.selectedIds();
    const count = list.filter(c => sel.has(c.id)).length;
    return count > 0 && count < list.length;
  });

  constructor() {
    this.loadPresetsFromStorage();
  }

  loadPresetsFromStorage(): void {
    try {
      const stored = localStorage.getItem(CONTAINER_FILTER_STORAGE_KEY);
      if (stored) {
        this.presets.set(JSON.parse(stored));
      } else {
        this.presets.set([...DEFAULT_CONTAINER_PRESETS]);
      }
    } catch {
      this.presets.set([...DEFAULT_CONTAINER_PRESETS]);
    }
  }

  savePreset(name: string): void {
    if (!name.trim()) return;
    const currentFilters = { ...this.filters() };
    const cleanFilters: Record<string, string> = {};
    if (currentFilters.q) cleanFilters['q'] = currentFilters.q;
    if (currentFilters.state) cleanFilters['state'] = currentFilters.state;
    if (currentFilters.health) cleanFilters['health'] = currentFilters.health;
    if (currentFilters.compose_project) cleanFilters['compose_project'] = currentFilters.compose_project;

    const updated = [...this.presets().filter(p => p.name !== name), { name, filters: cleanFilters }];
    this.presets.set(updated);
    try {
      localStorage.setItem(CONTAINER_FILTER_STORAGE_KEY, JSON.stringify(updated));
      this.toast.success(`Preset '${name}' saved`);
    } catch {}
  }

  deletePreset(name: string): void {
    const updated = this.presets().filter(p => p.name !== name);
    this.presets.set(updated);
    try {
      localStorage.setItem(CONTAINER_FILTER_STORAGE_KEY, JSON.stringify(updated));
      this.toast.info(`Preset '${name}' removed`);
    } catch {}
  }

  loadPreset(name: string): void {
    const preset = this.presets().find(p => p.name === name);
    if (!preset) return;
    this.filters.set({
      q: preset.filters.q || '',
      state: preset.filters.state || '',
      health: preset.filters.health || '',
      compose_project: preset.filters.compose_project || '',
    });
    this.page.set(1);
    this.loadContainers();
  }

  loadContainers(): void {
    this.loading.set(true);
    this.error.set(null);

    const f = this.filters();
    const params: ContainerFilterParams = {
      q: f.q || undefined,
      state: f.state || undefined,
      health: f.health || undefined,
      compose_project: f.compose_project || undefined,
      sort_by: this.sortBy(),
      sort_order: this.sortOrder(),
      page: this.page(),
      page_size: this.pageSize(),
    };

    this.containersService.listContainers(params).subscribe({
      next: (res) => {
        this.containers.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.total_pages);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || err.message || 'Failed to load containers';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }

  setFilter(field: 'q' | 'state' | 'health' | 'compose_project', value: string): void {
    this.filters.update(current => ({ ...current, [field]: value }));
    this.page.set(1);
    this.loadContainers();
  }

  clearFilters(): void {
    this.filters.set({ q: '', state: '', health: '', compose_project: '' });
    this.page.set(1);
    this.loadContainers();
  }

  setSort(sortBy: string): void {
    if (this.sortBy() === sortBy) {
      this.sortOrder.update(order => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(sortBy);
      this.sortOrder.set('asc');
    }
    this.loadContainers();
  }

  setPage(page: number): void {
    this.page.set(page);
    this.loadContainers();
  }

  toggleSelect(id: string): void {
    this.selectedIds.update(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      const allIds = new Set(this.containers().map(c => c.id));
      this.selectedIds.set(allIds);
    } else {
      this.selectedIds.set(new Set());
    }
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  optimisticAction(containerId: string, action: string): void {
    const currentList = this.containers();
    const target = currentList.find(c => c.id === containerId);
    if (!target) return;

    const previousState = target.state;
    let nextState = previousState;
    if (action === 'stop' || action === 'kill') nextState = 'exited';
    else if (action === 'start' || action === 'restart' || action === 'unpause') nextState = 'running';
    else if (action === 'pause') nextState = 'paused';

    // Apply optimistic mutation
    this.containers.update(list =>
      list.map(c => (c.id === containerId ? { ...c, state: nextState } : c))
    );

    this.containersService.executeAction(containerId, action).subscribe({
      next: () => {
        this.toast.success(`Container ${target.name} ${action} completed`);
      },
      error: (err) => {
        // Rollback
        this.containers.update(list =>
          list.map(c => (c.id === containerId ? { ...c, state: previousState } : c))
        );
        const msg = err.error?.detail || `Failed to execute ${action}`;
        this.toast.error(msg);
      },
    });
  }

  executeBulkAction(action: string): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.loading.set(true);
    this.containersService.bulkAction(action, ids).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.clearSelection();
        this.toast.info(`Bulk ${action}: ${res.total_success} succeeded, ${res.total_failed} failed`);
        this.loadContainers();
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.detail || `Bulk action failed`;
        this.toast.error(msg);
      },
    });
  }

  deleteContainer(containerId: string, containerName: string): void {
    this.loading.set(true);
    this.containersService.getDeleteToken(containerId).subscribe({
      next: (tokenRes) => {
        this.containersService.deleteContainer(containerId, tokenRes.token).subscribe({
          next: () => {
            this.containers.update(list => list.filter(c => c.id !== containerId));
            this.total.update(n => Math.max(0, n - 1));
            this.selectedIds.update(set => {
              const next = new Set(set);
              next.delete(containerId);
              return next;
            });
            this.loading.set(false);
            this.toast.success(`Container ${containerName} deleted`);
          },
          error: (err) => {
            this.loading.set(false);
            const msg = err.error?.detail || 'Failed to delete container';
            this.toast.error(msg);
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.detail || 'Failed to acquire delete confirmation token';
        this.toast.error(msg);
      },
    });
  }

  initStream(): void {
    if (this.streamSub) return;
    this.streamSub = this.containersService.getContainersStream().subscribe({
      next: (metricsList) => {
        const nextMap = new Map<string, ContainerLiveMetrics>();
        for (const m of metricsList) {
          nextMap.set(m.container_id, m);
        }
        this.liveMetrics.set(nextMap);
      },
      error: () => {},
    });
  }

  destroyStream(): void {
    if (this.streamSub) {
      this.streamSub.unsubscribe();
      this.streamSub = null;
    }
  }
}
