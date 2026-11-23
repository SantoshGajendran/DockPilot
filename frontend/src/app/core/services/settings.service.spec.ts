import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SettingsService } from './settings.service';
import { SETTINGS_ENDPOINTS } from '../constants/settings.constants';
import {
  RetentionRunResponse,
  SettingsResponse,
  StorageUsageResponse,
} from '../models/settings.model';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

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
    metadata: {
      collection_interval_seconds: {
        hot_reload: true,
        restart_required: false,
        help_text: 'Test help',
      },
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SettingsService],
    });
    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch settings', () => {
    service.getSettings().subscribe((res) => {
      expect(res).toEqual(mockSettings);
    });

    const req = httpMock.expectOne(SETTINGS_ENDPOINTS.settings);
    expect(req.request.method).toBe('GET');
    req.flush(mockSettings);
  });

  it('should update settings', () => {
    service.updateSettings({ collection_interval_seconds: 10 }).subscribe((res) => {
      expect(res).toEqual(mockSettings);
    });

    const req = httpMock.expectOne(SETTINGS_ENDPOINTS.settings);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ collection_interval_seconds: 10 });
    req.flush(mockSettings);
  });

  it('should fetch storage usage', () => {
    const mockStorage: StorageUsageResponse = {
      database_name: 'dockpilot',
      database_size_bytes: 10240,
      database_size_human: '10.0 KB',
      tables: [{ table_name: 'container_metrics', row_count: 5, size_bytes: 1280, size_human: '1.2 KB' }],
      updated_at: '2026-11-23T10:00:00Z',
    };

    service.getStorageUsage().subscribe((res) => {
      expect(res).toEqual(mockStorage);
    });

    const req = httpMock.expectOne(SETTINGS_ENDPOINTS.storage);
    expect(req.request.method).toBe('GET');
    req.flush(mockStorage);
  });

  it('should trigger manual retention run', () => {
    const mockRetention: RetentionRunResponse = {
      metrics_downsampled: 10,
      metrics_deleted: 5,
      events_deleted: 2,
      audit_logs_deleted: 1,
      terminal_sessions_deleted: 0,
      duration_seconds: 0.15,
      timestamp: '2026-11-23T10:00:00Z',
      message: 'Success',
    };

    service.runRetention().subscribe((res) => {
      expect(res).toEqual(mockRetention);
    });

    const req = httpMock.expectOne(SETTINGS_ENDPOINTS.retentionRun);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockRetention);
  });
});
