import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { UserItem } from '../../../core/models/user-mgmt.model';

export interface ResetPasswordDialogData {
  user: UserItem;
}

@Component({
  selector: 'dp-reset-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="warn">lock_reset</mat-icon>
      <span>Reset Password for {{ data.user.username }}</span>
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <p class="desc">
          Set a new temporary password for <strong>{{ data.user.username }}</strong>. All currently active sessions will be invalidated for security.
        </p>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>New Password</mat-label>
          <input matInput formControlName="new_password" type="password" />
          <mat-error *ngIf="form.get('new_password')?.hasError('required')">Password is required</mat-error>
          <mat-error *ngIf="form.get('new_password')?.hasError('minlength')">Minimum 6 characters</mat-error>
        </mat-form-field>

        <mat-checkbox formControlName="force_password_change">
          Require user to change password on next sign-in
        </mat-checkbox>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" [disabled]="form.invalid" (click)="save()">
        Reset Password
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        min-width: 380px;
        padding-top: 0.5rem;
      }
      .w-full {
        width: 100%;
      }
      .desc {
        color: #475569;
        font-size: 0.9rem;
        line-height: 1.4;
        margin: 0 0 0.5rem;
      }
      h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    `,
  ],
})
export class ResetPasswordDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent>);
  readonly data: ResetPasswordDialogData = inject(MAT_DIALOG_DATA);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      force_password_change: [true],
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }
}
