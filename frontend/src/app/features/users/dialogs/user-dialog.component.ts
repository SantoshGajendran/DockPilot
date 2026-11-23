import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { UserItem } from '../../../core/models/user-mgmt.model';
import { ROLE_OPTIONS } from '../../../core/constants/user-mgmt.constants';

export interface UserDialogData {
  user?: UserItem;
}

@Component({
  selector: 'dp-user-dialog',
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
    MatCheckboxModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon color="primary">{{ isEdit ? 'edit' : 'person_add' }}</mat-icon>
      <span>{{ isEdit ? 'Edit User' : 'Create New User' }}</span>
    </h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <!-- Username -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" placeholder="e.g. john_doe" />
          <mat-error *ngIf="form.get('username')?.hasError('required')">Username is required</mat-error>
        </mat-form-field>

        <!-- Email -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Email Address</mat-label>
          <input matInput formControlName="email" type="email" placeholder="john@company.com" />
          <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email format</mat-error>
        </mat-form-field>

        <!-- Password (only for create) -->
        <mat-form-field appearance="outline" class="w-full" *ngIf="!isEdit">
          <mat-label>Initial Password</mat-label>
          <input matInput formControlName="password" type="password" />
          <mat-error *ngIf="form.get('password')?.hasError('required')">Password is required</mat-error>
          <mat-error *ngIf="form.get('password')?.hasError('minlength')">Minimum 6 characters</mat-error>
        </mat-form-field>

        <!-- Role -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            <mat-option *ngFor="let opt of roleOptions" [value]="opt.value">
              <div class="role-option">
                <strong>{{ opt.label }}</strong>
                <small class="role-desc"> — {{ opt.description }}</small>
              </div>
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Force Password Change -->
        <div class="toggle-row" *ngIf="!isEdit">
          <mat-checkbox formControlName="force_password_change">
            Force password change on first login
          </mat-checkbox>
        </div>

        <!-- Active Toggle -->
        <div class="toggle-row">
          <mat-slide-toggle formControlName="is_active">
            Active Account
          </mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">
        {{ isEdit ? 'Save Changes' : 'Create User' }}
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
      .role-desc {
        color: #64748b;
      }
      .toggle-row {
        margin: 0.25rem 0;
      }
      h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    `,
  ],
})
export class UserDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UserDialogComponent>);
  readonly data: UserDialogData = inject(MAT_DIALOG_DATA) || {};

  readonly isEdit = !!this.data.user;
  readonly roleOptions = ROLE_OPTIONS;

  form!: FormGroup;

  ngOnInit(): void {
    const u = this.data.user;
    this.form = this.fb.group({
      username: [{ value: u?.username || '', disabled: this.isEdit }, [Validators.required]],
      email: [u?.email || '', [Validators.email]],
      password: [
        '',
        this.isEdit ? [] : [Validators.required, Validators.minLength(6)],
      ],
      role: [u?.role || 'viewer', [Validators.required]],
      force_password_change: [u?.force_password_change ?? true],
      is_active: [u?.is_active ?? true],
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    this.dialogRef.close(val);
  }
}
