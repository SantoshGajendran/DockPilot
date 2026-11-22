import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertEvent, AlertRule, AlertSilenceCreate } from '../../../core/models/alerts.model';

export interface SilenceDialogData {
  event?: AlertEvent;
  rule?: AlertRule;
}

@Component({
  selector: 'dp-silence-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Silence Alert</h2>
    <mat-dialog-content class="dialog-content">
      <div class="target-info" *ngIf="data.event as e">
        <div><strong>Rule:</strong> {{ e.rule_name }}</div>
        <div><strong>Target:</strong> {{ e.target_name || e.target_id || 'All' }}</div>
      </div>
      <div class="target-info" *ngIf="!data.event && data.rule as r">
        <div><strong>Rule:</strong> {{ r.name }}</div>
      </div>

      <form [formGroup]="form" class="silence-form">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Silence Duration</mat-label>
          <mat-select formControlName="duration_minutes">
            <mat-option [value]="15">15 Minutes</mat-option>
            <mat-option [value]="30">30 Minutes</mat-option>
            <mat-option [value]="60">1 Hour</mat-option>
            <mat-option [value]="120">2 Hours</mat-option>
            <mat-option [value]="360">6 Hours</mat-option>
            <mat-option [value]="720">12 Hours</mat-option>
            <mat-option [value]="1440">24 Hours</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Reason (Optional)</mat-label>
          <input matInput formControlName="reason" placeholder="e.g. Scheduled database maintenance" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="warn" (click)="onSave()" [disabled]="form.invalid">
        Silence Alert
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-content {
        min-width: 380px;
        padding-top: 8px;
      }
      .target-info {
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 0.875rem;
      }
      .silence-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .w-100 {
        width: 100%;
      }
    `,
  ],
})
export class SilenceDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<SilenceDialogComponent>);
  readonly data: SilenceDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private readonly fb = inject(FormBuilder);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      duration_minutes: [60, [Validators.required, Validators.min(1)]],
      reason: ['', [Validators.maxLength(256)]],
    });
  }

  onSave(): void {
    if (this.form.invalid) return;

    const val = this.form.value;
    const payload: AlertSilenceCreate = {
      rule_id: this.data.event?.rule_id || this.data.rule?.id || undefined,
      container_id: this.data.event?.target_id || undefined,
      duration_minutes: Number(val.duration_minutes),
      reason: val.reason || null,
    };
    this.dialogRef.close(payload);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
