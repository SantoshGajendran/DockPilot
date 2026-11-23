import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { SettingsStore } from './settings.store';
import { AuthService } from '../../core/services/auth.service';
import { SETTINGS_SECTIONS, SettingsSection } from '../../core/constants/settings.constants';
import { ComponentCanDeactivate } from '../../core/guards/pending-changes.guard';
import { FieldMetadata } from '../../core/models/settings.model';

@Component({
  selector: 'dp-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  providers: [SettingsStore],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit, ComponentCanDeactivate {
  readonly store = inject(SettingsStore);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly sections: SettingsSection[] = SETTINGS_SECTIONS;
  selectedSectionIndex = 0;

  settingsForm!: FormGroup;
  displayedTableColumns = ['table_name', 'row_count', 'size_human'];

  constructor() {
    effect(() => {
      const s = this.store.settings();
      if (s) {
        this.populateForm(s);
      }
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.store.init();
  }

  canDeactivate(): boolean {
    if (this.settingsForm && this.settingsForm.dirty) {
      return confirm('You have unsaved settings changes. Are you sure you want to leave this page?');
    }
    return true;
  }

  canAdmin(): boolean {
    return this.authService.hasRole('admin');
  }

  private initForm(): void {
    this.settingsForm = this.fb.group({
      collection_interval_seconds: [5, [Validators.required, Validators.min(1), Validators.max(60)]],
      metrics_interval_seconds: [3, [Validators.required, Validators.min(1), Validators.max(30)]],
      container_detail_stats_interval_seconds: [2, [Validators.required, Validators.min(1), Validators.max(10)]],
      host_metrics_interval_seconds: [3, [Validators.required, Validators.min(1), Validators.max(30)]],
      log_tail_default: [200, [Validators.required, Validators.min(10), Validators.max(1000)]],

      retention_days: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
      events_retention_days: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
      audit_retention_days: [90, [Validators.required, Validators.min(7), Validators.max(365)]],
      terminal_transcript_retention_days: [30, [Validators.required, Validators.min(1), Validators.max(365)]],
      metrics_rollup_age_hours: [24, [Validators.required, Validators.min(1), Validators.max(168)]],

      secret_mask_patterns: ['', [Validators.required]],
      max_login_attempts: [5, [Validators.required, Validators.min(3), Validators.max(20)]],
      lockout_duration_minutes: [15, [Validators.required, Validators.min(1), Validators.max(60)]],

      alert_eval_interval_seconds: [15, [Validators.required, Validators.min(5), Validators.max(300)]],
      alert_default_cooldown_minutes: [15, [Validators.required, Validators.min(1), Validators.max(1440)]],

      terminal_enabled: [false],
      metrics_collection_enabled: [true],
      auto_prune_enabled: [false],
      registration_enabled: [false],
    });

    if (!this.canAdmin()) {
      this.settingsForm.disable();
    }

    this.settingsForm.valueChanges.subscribe(() => {
      this.store.setDirty(this.settingsForm.dirty);
    });
  }

  private populateForm(s: any): void {
    const rawPatterns = s.security.secret_mask_patterns || [];
    const patternStr = Array.isArray(rawPatterns) ? rawPatterns.join(', ') : rawPatterns;

    this.settingsForm.patchValue({
      collection_interval_seconds: s.telemetry.collection_interval_seconds,
      metrics_interval_seconds: s.telemetry.metrics_interval_seconds,
      container_detail_stats_interval_seconds: s.telemetry.container_detail_stats_interval_seconds,
      host_metrics_interval_seconds: s.telemetry.host_metrics_interval_seconds,
      log_tail_default: s.telemetry.log_tail_default,

      retention_days: s.retention.retention_days,
      events_retention_days: s.retention.events_retention_days,
      audit_retention_days: s.retention.audit_retention_days,
      terminal_transcript_retention_days: s.retention.terminal_transcript_retention_days,
      metrics_rollup_age_hours: s.retention.metrics_rollup_age_hours,

      secret_mask_patterns: patternStr,
      max_login_attempts: s.security.max_login_attempts,
      lockout_duration_minutes: s.security.lockout_duration_minutes,

      alert_eval_interval_seconds: s.alerts.alert_eval_interval_seconds,
      alert_default_cooldown_minutes: s.alerts.alert_default_cooldown_minutes,

      terminal_enabled: s.features.terminal_enabled,
      metrics_collection_enabled: s.features.metrics_collection_enabled,
      auto_prune_enabled: s.features.auto_prune_enabled,
      registration_enabled: s.features.registration_enabled,
    }, { emitEvent: false });

    this.settingsForm.markAsPristine();
    this.store.setDirty(false);
  }

  getMeta(field: string): FieldMetadata | undefined {
    return this.store.settings()?.metadata?.[field];
  }

  save(): void {
    if (this.settingsForm.invalid || !this.canAdmin()) return;

    const val = this.settingsForm.getRawValue();
    const patternInput: string = val.secret_mask_patterns || '';
    const patterns = patternInput
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const payload = {
      ...val,
      secret_mask_patterns: patterns,
    };

    this.store.saveSettings(payload, () => {
      this.settingsForm.markAsPristine();
    });
  }

  resetForm(): void {
    const s = this.store.settings();
    if (s) {
      this.populateForm(s);
    }
  }

  confirmRunRetention(): void {
    if (!this.canAdmin()) return;
    if (confirm('Run data retention now? This will downsample metrics older than 24h into hourly rollups and permanently delete expired records.')) {
      this.store.runRetention();
    }
  }
}
