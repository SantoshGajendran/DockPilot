import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  ImageItem,
  NetworkItem,
  VolumeItem,
} from '../../core/models/resources.model';
import { ResourceTabType } from '../../core/constants/resources.constants';
import { ResourcesService } from '../../core/services/resources.service';

@Injectable()
export class ResourcesStore {
  private readonly service = inject(ResourcesService);

  readonly activeTab = signal<ResourceTabType>('images');
  readonly searchQuery = signal<string>('');

  readonly images = signal<ImageItem[]>([]);
  readonly totalImageSize = signal<number>(0);
  readonly imagesLoading = signal<boolean>(false);
  readonly imagesError = signal<string | null>(null);

  readonly volumes = signal<VolumeItem[]>([]);
  readonly volumesLoading = signal<boolean>(false);
  readonly volumesError = signal<string | null>(null);

  readonly networks = signal<NetworkItem[]>([]);
  readonly networksLoading = signal<boolean>(false);
  readonly networksError = signal<string | null>(null);

  readonly actionInProgress = signal<boolean>(false);
  readonly actionError = signal<string | null>(null);

  readonly filteredImages = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.images();
    if (!q) return list;
    return list.filter((img) =>
      img.id.toLowerCase().includes(q) ||
      img.short_id.toLowerCase().includes(q) ||
      img.tags.some((t) => t.toLowerCase().includes(q)) ||
      img.in_use_by.some((c) => c.name.toLowerCase().includes(q))
    );
  });

  readonly filteredVolumes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.volumes();
    if (!q) return list;
    return list.filter((vol) =>
      vol.name.toLowerCase().includes(q) ||
      vol.driver.toLowerCase().includes(q) ||
      vol.in_use_by.some((c) => c.name.toLowerCase().includes(q))
    );
  });

  readonly filteredNetworks = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.networks();
    if (!q) return list;
    return list.filter((net) =>
      net.name.toLowerCase().includes(q) ||
      net.driver.toLowerCase().includes(q) ||
      net.scope.toLowerCase().includes(q) ||
      net.in_use_by.some((c) => c.name.toLowerCase().includes(q))
    );
  });

  readonly unusedImagesCount = computed(() => {
    return this.images().filter((img) => !img.is_in_use && !img.is_protected).length;
  });

  readonly unusedVolumesCount = computed(() => {
    return this.volumes().filter((vol) => !vol.is_in_use && !vol.is_protected).length;
  });

  readonly unusedNetworksCount = computed(() => {
    return this.networks().filter((net) => !net.is_in_use && !net.is_protected && !net.is_built_in).length;
  });

  readonly isLoading = computed(() => {
    return this.imagesLoading() || this.volumesLoading() || this.networksLoading() || this.actionInProgress();
  });

  init(): void {
    this.loadAll();
  }

  setActiveTab(tab: ResourceTabType): void {
    this.activeTab.set(tab);
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
  }

  loadAll(): void {
    this.loadImages();
    this.loadVolumes();
    this.loadNetworks();
  }

  loadImages(): void {
    this.imagesLoading.set(true);
    this.imagesError.set(null);
    this.service.getImages().subscribe({
      next: (res) => {
        this.images.set(res.images);
        this.totalImageSize.set(res.total_size);
        this.imagesLoading.set(false);
      },
      error: (err) => {
        this.imagesError.set(err?.message || 'Failed to load images');
        this.imagesLoading.set(false);
      },
    });
  }

  loadVolumes(): void {
    this.volumesLoading.set(true);
    this.volumesError.set(null);
    this.service.getVolumes().subscribe({
      next: (res) => {
        this.volumes.set(res.volumes);
        this.volumesLoading.set(false);
      },
      error: (err) => {
        this.volumesError.set(err?.message || 'Failed to load volumes');
        this.volumesLoading.set(false);
      },
    });
  }

  loadNetworks(): void {
    this.networksLoading.set(true);
    this.networksError.set(null);
    this.service.getNetworks().subscribe({
      next: (res) => {
        this.networks.set(res.networks);
        this.networksLoading.set(false);
      },
      error: (err) => {
        this.networksError.set(err?.message || 'Failed to load networks');
        this.networksLoading.set(false);
      },
    });
  }

  deleteImage(id: string, onSuccess?: () => void): void {
    this.actionInProgress.set(true);
    this.actionError.set(null);
    this.service.removeImage(id).subscribe({
      next: () => {
        this.images.update((list) => list.filter((i) => i.id !== id && i.short_id !== id && !i.tags.includes(id)));
        this.actionInProgress.set(false);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.actionError.set(err?.error?.detail || err?.message || 'Failed to delete image');
        this.actionInProgress.set(false);
      },
    });
  }

  deleteVolume(name: string, onSuccess?: () => void): void {
    this.actionInProgress.set(true);
    this.actionError.set(null);
    this.service.removeVolume(name).subscribe({
      next: () => {
        this.volumes.update((list) => list.filter((v) => v.name !== name));
        this.actionInProgress.set(false);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.actionError.set(err?.error?.detail || err?.message || 'Failed to delete volume');
        this.actionInProgress.set(false);
      },
    });
  }

  deleteNetwork(id: string, onSuccess?: () => void): void {
    this.actionInProgress.set(true);
    this.actionError.set(null);
    this.service.removeNetwork(id).subscribe({
      next: () => {
        this.networks.update((list) => list.filter((n) => n.id !== id && n.short_id !== id && n.name !== id));
        this.actionInProgress.set(false);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.actionError.set(err?.error?.detail || err?.message || 'Failed to delete network');
        this.actionInProgress.set(false);
      },
    });
  }
}
