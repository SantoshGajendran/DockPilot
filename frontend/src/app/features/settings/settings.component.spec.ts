import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SettingsComponent } from './settings.component';
import { SettingsStore } from './settings.store';
import { SettingsService } from '../../core/services/settings.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SettingsResponse, StorageUsageResponse, RetentionRunResponse } from '../../core/models/settings.model';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let settingsServiceMock: any;
  let authServiceMock: any;
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
      secret_mask_patterns: ['*PASSWORD*', '*SECRET*'],
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
        help_text: 'Help text for collection interval',
      },
    },
  };

  const mockStorage: StorageUsageResponse = {
    database_name: 'dockpilot',
    database_size_bytes: 1048576,
    database_size_human: '1.0 MB',
    tables: [{ table_name: 'container_metrics', row_count: 50, size_bytes: 10240, size_human: '10.0 KB' }],
    updated_at: '2026-11-23T10:00:00Z',
  };

  const mockRetention: RetentionRunResponse = {
    metrics_downsampled: 10,
    metrics_deleted: 5,
    events_deleted: 2,
    audit_logs_deleted: 1,
    terminal_sessions_deleted: 0,
    duration_seconds: 0.2,
    timestamp: '2026-11-23T10:00:00Z',
    message: 'Cleanup completed',
  };

  beforeEach(async () => {
    settingsServiceMock = {
      getSettings: jest.fn().mockReturnValue(of(mockSettings)),
      updateSettings: jest.fn().mockReturnValue(of(mockSettings)),
      getStorageUsage: jest.fn().mockReturnValue(of(mockStorage)),
      runRetention: jest.fn().mockReturnValue(of(mockRetention)),
    };

    authServiceMock = {
      currentUser: signal({ id: 'u1', username: 'admin', role: 'admin' }),
      hasRole: jest.fn().mockReturnValue(true),
    };

    toastServiceMock = {
      show: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, NoopAnimationsModule],
      providers: [
        { provide: SettingsService, useValue: settingsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    })
      .overrideComponent(SettingsComponent, {
        set: {
          providers: [SettingsStore],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and populate settings form', () => {
    expect(component).toBeTruthy();
    expect(settingsServiceMock.getSettings).toHaveBeenCalled();
    expect(settingsServiceMock.getStorageUsage).toHaveBeenCalled();
    expect(component.settingsForm.get('collection_interval_seconds')?.value).toBe(5);
    expect(component.settingsForm.get('retention_days')?.value).toBe(30);
    expect(component.settingsForm.get('secret_mask_patterns')?.value).toBe('*PASSWORD*, *SECRET*');
  });

  it('should track dirty state on form change', () => {
    expect(component.canDeactivate()).toBe(true);
    component.settingsForm.get('collection_interval_seconds')?.setValue(15);
    component.settingsForm.markAsDirty();
    fixture.detectChanges();

    expect(component.settingsForm.dirty).toBe(true);
  });

  it('should save settings when admin submits valid form', () => {
    component.settingsForm.get('collection_interval_seconds')?.setValue(10);
    component.settingsForm.markAsDirty();

    component.save();
    expect(settingsServiceMock.updateSettings).toHaveBeenCalled();
    const callArgs = settingsServiceMock.updateSettings.mock.calls[0][0];
    expect(callArgs.collection_interval_seconds).toBe(10);
    expect(callArgs.secret_mask_patterns).toEqual(['*PASSWORD*', '*SECRET*']);
  });

  it('should reset form back to store state', () => {
    component.settingsForm.get('collection_interval_seconds')?.setValue(25);
    component.settingsForm.markAsDirty();

    component.resetForm();
    expect(component.settingsForm.get('collection_interval_seconds')?.value).toBe(5);
    expect(component.settingsForm.pristine).toBe(true);
  });

  it('should trigger retention run on user confirm', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    component.confirmRunRetention();
    expect(settingsServiceMock.runRetention).toHaveBeenCalled();
  });
});
