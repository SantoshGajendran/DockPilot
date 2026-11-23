import { Injectable, inject, signal } from '@angular/core';

import {
  RetentionRunResponse,
  SettingsResponse,
  SettingsUpdateRequest,
  StorageUsageResponse,
} from '../../core/models/settings.model';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';

@Injectable()
export class SettingsStore {
  private readonly settingsService = inject(SettingsService);
  private readonly toast = inject(ToastService);

  readonly settings = signal<SettingsResponse | null>(null);
  readonly storage = signal<StorageUsageResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly isRunningRetention = signal<boolean>(false);
  readonly lastRetentionResult = signal<RetentionRunResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly isDirty = signal<boolean>(false);

  init(): void {
    this.loadSettings();
    this.loadStorage();
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.settingsService.getSettings().subscribe({
      next: (resp) => {
        this.settings.set(resp);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.message || 'Failed to load settings');
        this.isLoading.set(false);
      },
    });
  }

  loadStorage(): void {
    this.settingsService.getStorageUsage().subscribe({
      next: (resp) => {
        this.storage.set(resp);
      },
      error: () => {},
    });
  }

  saveSettings(payload: SettingsUpdateRequest, onSuccess?: () => void): void {
    this.isSaving.set(true);
    this.settingsService.updateSettings(payload).subscribe({
      next: (resp) => {
        this.settings.set(resp);
        this.isSaving.set(false);
        this.isDirty.set(false);
        this.toast.show('Settings updated successfully');
        onSuccess?.();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.show(err?.error?.detail || err?.message || 'Failed to update settings');
      },
    });
  }

  runRetention(): void {
    this.isRunningRetention.set(true);
    this.settingsService.runRetention().subscribe({
      next: (resp) => {
        this.lastRetentionResult.set(resp);
        this.isRunningRetention.set(false);
        this.toast.show(resp.message || 'Retention cleanup executed successfully');
        this.loadStorage();
      },
      error: (err) => {
        this.isRunningRetention.set(false);
        this.toast.show(err?.error?.detail || err?.message || 'Retention run failed');
      },
    });
  }

  setDirty(dirty: boolean): void {
    this.isDirty.set(dirty);
  }
}
