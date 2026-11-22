import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';

import {
  AlertDryRunResponse,
  AlertRule,
  AlertRuleCreate,
  AlertRuleUpdate,
} from '../../../core/models/alerts.model';
import {
  RULE_TYPES,
  RuleTypeMeta,
  SCOPE_TYPES,
  SEVERITIES,
} from '../../../core/constants/alerts.constants';
import { AlertsService } from '../../../core/services/alerts.service';

export interface RuleDialogData {
  rule?: AlertRule;
}

@Component({
  selector: 'dp-rule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTableModule,
  ],
  templateUrl: './rule-dialog.component.html',
  styleUrls: ['./rule-dialog.component.scss'],
})
export class RuleDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<RuleDialogComponent>);
  readonly data: RuleDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private readonly fb = inject(FormBuilder);
  private readonly alertsService = inject(AlertsService);

  readonly ruleTypes = RULE_TYPES;
  readonly scopeTypes = SCOPE_TYPES;
  readonly severities = SEVERITIES;

  readonly isEdit = !!this.data.rule;
  readonly testing = signal<boolean>(false);
  readonly dryRunResult = signal<AlertDryRunResponse | null>(null);
  readonly dryRunError = signal<string | null>(null);

  form!: FormGroup;

  ngOnInit(): void {
    const r = this.data.rule;
    this.form = this.fb.group({
      name: [r?.name || '', [Validators.required, Validators.maxLength(128)]],
      description: [r?.description || '', [Validators.maxLength(256)]],
      rule_type: [r?.rule_type || 'container_down', [Validators.required]],
      scope_type: [r?.scope_type || 'all', [Validators.required]],
      scope_value: [r?.scope_value || ''],
      severity: [r?.severity || 'warning', [Validators.required]],
      threshold: [r?.threshold !== undefined ? r.threshold : null],
      duration_minutes: [r?.duration_minutes ?? 0, [Validators.min(0)]],
      cooldown_minutes: [r?.cooldown_minutes ?? 15, [Validators.required, Validators.min(1)]],
      enabled: [r?.enabled ?? true],
    });

    // Update validators when rule_type changes
    this.form.get('rule_type')?.valueChanges.subscribe((type) => {
      const meta = this.getRuleMeta(type);
      const threshCtrl = this.form.get('threshold');
      if (meta?.requiresThreshold) {
        threshCtrl?.setValidators([Validators.required]);
        if (threshCtrl?.value === null || threshCtrl?.value === undefined) {
          threshCtrl?.setValue(meta.defaultThreshold ?? 80.0);
        }
      } else {
        threshCtrl?.clearValidators();
      }
      threshCtrl?.updateValueAndValidity();
    });
  }

  getRuleMeta(type: string): RuleTypeMeta | undefined {
    return this.ruleTypes.find((t) => t.type === type);
  }

  isThresholdRequired(): boolean {
    const type = this.form.get('rule_type')?.value;
    return !!this.getRuleMeta(type)?.requiresThreshold;
  }

  getUnit(): string {
    const type = this.form.get('rule_type')?.value;
    return this.getRuleMeta(type)?.unit || '';
  }

  getScopePlaceholder(): string {
    const scope = this.form.get('scope_type')?.value;
    const item = this.scopeTypes.find((s) => s.value === scope);
    return item?.placeholder || '';
  }

  runDryRun(): void {
    if (this.testing()) return;
    this.testing.set(true);
    this.dryRunError.set(null);
    this.dryRunResult.set(null);

    const val = this.form.value;
    this.alertsService
      .dryRunRule({
        rule_type: val.rule_type,
        scope_type: val.scope_type,
        scope_value: val.scope_value || null,
        threshold: val.threshold !== null && val.threshold !== '' ? Number(val.threshold) : null,
        duration_minutes: Number(val.duration_minutes || 0),
      })
      .subscribe({
        next: (res) => {
          this.dryRunResult.set(res);
          this.testing.set(false);
        },
        error: (err) => {
          this.dryRunError.set(err?.message || 'Dry run evaluation failed');
          this.testing.set(false);
        },
      });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const payload: AlertRuleCreate = {
      name: val.name,
      description: val.description || null,
      rule_type: val.rule_type,
      scope_type: val.scope_type,
      scope_value: val.scope_value || null,
      severity: val.severity,
      threshold: val.threshold !== null && val.threshold !== '' ? Number(val.threshold) : null,
      duration_minutes: Number(val.duration_minutes || 0),
      cooldown_minutes: Number(val.cooldown_minutes || 15),
      enabled: val.enabled,
    };

    this.dialogRef.close(payload);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
