import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SettingsStore } from './settings.store';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import {
  RetentionRunResponse,
  SettingsResponse,
  StorageUsageResponse,
} from '../../core/models/settings.model';

describe('SettingsStore', () => {
  let store: SettingsStore;
  let settingsServiceMock: any;
  let toastServiceMock: any;

  const mockSettings: SettingsResponse = {
    telemetry: {
      collection_interval_seconds: 5,
      metrics_interval_seconds: 3,
      container_detail_stats_interval_seconds: 2,
      host_metrics_interval_seconds: 3,
      log_tail_default: 200,
    },
    retention: {
      retention_days: 30,
      events_retention_days: 30,
      audit_retention_days: 90,
      terminal_transcript_retention_days: 30,
      metrics_rollup_age_hours: 24,
    },
    security: {
      secret_mask_patterns: ['*PASSWORD*'],
      max_login_attempts: 5,
      lockout_duration_minutes: 15,
    },
    alerts: {
      alert_eval_interval_seconds: 15,
      alert_default_cooldown_minutes: 15,
    },
    features: {
      terminal_enabled: false,
      metrics_collection_enabled: true,
      auto_prune_enabled: false,
      registration_enabled: false,
    },
    metadata: {},
  };

  const mockStorage: StorageUsageResponse = {
    database_name: 'dockpilot',
    database_size_bytes: 5000,
    database_size_human: '5.0 KB',
    tables: [],
    updated_at: '2026-11-23T10:00:00Z',
  };

  const mockRetention: RetentionRunResponse = {
    metrics_downsampled: 2,
    metrics_deleted: 1,
    events_deleted: 1,
    audit_logs_deleted: 0,
    terminal_sessions_deleted: 0,
    duration_seconds: 0.1,
    timestamp: '2026-11-23T10:00:00Z',
    message: 'Cleanup successful',
  };

  beforeEach(() => {
    settingsServiceMock = {
      getSettings: jest.fn().mockReturnValue(of(mockSettings)),
      updateSettings: jest.fn().mockReturnValue(of(mockSettings)),
      getStorageUsage: jest.fn().mockReturnValue(of(mockStorage)),
      runRetention: jest.fn().mockReturnValue(of(mockRetention)),
    };

    toastServiceMock = {
      show: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SettingsStore,
        { provide: SettingsService, useValue: settingsServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });

    store = TestBed.inject(SettingsStore);
  });

  it('should initialize and load settings and storage', () => {
    store.init();
    expect(settingsServiceMock.getSettings).toHaveBeenCalled();
    expect(settingsServiceMock.getStorageUsage).toHaveBeenCalled();
    expect(store.settings()).toEqual(mockSettings);
    expect(store.storage()).toEqual(mockStorage);
  });

  it('should save settings and show success toast', () => {
    const successCb = jest.fn();
    store.saveSettings({ collection_interval_seconds: 10 }, successCb);

    expect(settingsServiceMock.updateSettings).toHaveBeenCalledWith({ collection_interval_seconds: 10 });
    expect(toastServiceMock.show).toHaveBeenCalledWith('Settings updated successfully');
    expect(successCb).toHaveBeenCalled();
    expect(store.isDirty()).toBe(false);
  });

  it('should handle save error', () => {
    settingsServiceMock.updateSettings.mockReturnValue(throwError(() => new Error('Save error')));
    store.saveSettings({ collection_interval_seconds: 10 });

    expect(toastServiceMock.show).toHaveBeenCalledWith('Save error');
    expect(store.isSaving()).toBe(false);
  });

  it('should run retention and refresh storage', () => {
    store.runRetention();
    expect(settingsServiceMock.runRetention).toHaveBeenCalled();
    expect(store.lastRetentionResult()).toEqual(mockRetention);
    expect(toastServiceMock.show).toHaveBeenCalledWith('Cleanup successful');
    expect(settingsServiceMock.getStorageUsage).toHaveBeenCalled();
  });
});
