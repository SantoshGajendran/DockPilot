import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';

import {
  NotificationChannel,
  NotificationRoute,
  NotificationRouteCreate,
} from '../../../core/models/notifications.model';
import { RULE_TYPES, SCOPE_TYPES, SEVERITIES } from '../../../core/constants/alerts.constants';

export interface RouteDialogData {
  route?: NotificationRoute;
  channels: NotificationChannel[];
}

@Component({
  selector: 'dp-route-dialog',
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
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Notification Route' : 'Add Notification Route' }}</h2>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="route-form">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Route Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Critical Alerts to PagerDuty" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="col-6">
            <mat-label>Destination Channel</mat-label>
            <mat-select formControlName="channel_id">
              <mat-option *ngFor="let c of data.channels" [value]="c.id">
                {{ c.name }} ({{ c.channel_type | titlecase }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('channel_id')?.hasError('required')">Channel required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="col-6">
            <mat-label>Minimum Severity</mat-label>
            <mat-select formControlName="min_severity">
              <mat-option *ngFor="let s of severities" [value]="s.value">
                <mat-icon>{{ s.icon }}</mat-icon>
                {{ s.label }}+
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline" class="col-6">
            <mat-label>Rule Type Filter</mat-label>
            <mat-select formControlName="rule_type">
              <mat-option [value]="'all'">All Rules</mat-option>
              <mat-option *ngFor="let t of ruleTypes" [value]="t.type">
                {{ t.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="col-6">
            <mat-label>Scope</mat-label>
            <mat-select formControlName="scope_type">
              <mat-option *ngFor="let sc of scopeTypes" [value]="sc.value">
                {{ sc.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div *ngIf="form.get('scope_type')?.value !== 'all'" class="row">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Target Container / Label</mat-label>
            <input matInput formControlName="scope_value" placeholder="e.g. env=prod or web-proxy" />
          </mat-form-field>
        </div>

        <div class="toggle-row">
          <mat-slide-toggle formControlName="enabled" color="primary">
            Route Active
          </mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="form.invalid">
        {{ isEdit ? 'Save Route' : 'Create Route' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-content {
        min-width: 480px;
        padding-top: 8px;
      }
      .route-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .row {
        display: flex;
        gap: 12px;
      }
      .col-6 {
        flex: 6;
      }
      .w-100 {
        width: 100%;
      }
      .toggle-row {
        margin: 4px 0;
      }
    `,
  ],
})
export class RouteDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<RouteDialogComponent>);
  readonly data: RouteDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || { channels: [] };
  private readonly fb = inject(FormBuilder);

  readonly severities = SEVERITIES;
  readonly ruleTypes = RULE_TYPES;
  readonly scopeTypes = SCOPE_TYPES;
  readonly isEdit = !!this.data.route;

  form!: FormGroup;

  ngOnInit(): void {
    const r = this.data.route;
    this.form = this.fb.group({
      name: [r?.name || '', [Validators.required, Validators.maxLength(128)]],
      channel_id: [r?.channel_id || (this.data.channels[0]?.id ?? null), [Validators.required]],
      min_severity: [r?.min_severity || 'warning', [Validators.required]],
      rule_type: [r?.rule_type || 'all'],
      scope_type: [r?.scope_type || 'all', [Validators.required]],
      scope_value: [r?.scope_value || ''],
      enabled: [r?.enabled ?? true],
    });
  }

  onSave(): void {
    if (this.form.invalid) return;

    const val = this.form.value;
    const payload: NotificationRouteCreate = {
      channel_id: Number(val.channel_id),
      name: val.name.trim(),
      min_severity: val.min_severity,
      rule_type: val.rule_type === 'all' ? null : val.rule_type,
      scope_type: val.scope_type,
      scope_value: val.scope_value?.trim() || null,
      enabled: val.enabled,
    };
    this.dialogRef.close(payload);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
