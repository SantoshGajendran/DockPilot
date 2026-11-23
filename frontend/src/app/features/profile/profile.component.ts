import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import QRCode from 'qrcode';

import { ProfileStore } from './profile.store';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AtmosphereService } from '../../core/services/atmosphere.service';
import { getRoleMeta, RoleMeta } from '../../core/constants/user-mgmt.constants';

@Component({
  selector: 'dp-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSlideToggleModule,
  ],
  providers: [ProfileStore],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  readonly store = inject(ProfileStore);
  readonly authService = inject(AuthService);
  readonly atmosphereService = inject(AtmosphereService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  passwordForm!: FormGroup;
  totpCodeControl = this.fb.control('', [Validators.required, Validators.pattern(/^\d{6}$/)]);

  readonly qrCodeDataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const enrolData = this.store.totpEnrolData();
      if (enrolData?.otpauth_url) {
        QRCode.toDataURL(enrolData.otpauth_url, { width: 200, margin: 1 })
          .then((url) => this.qrCodeDataUrl.set(url))
          .catch(() => this.qrCodeDataUrl.set(null));
      } else {
        this.qrCodeDataUrl.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.store.init();
    this.passwordForm = this.fb.group({
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', [Validators.required]],
    });
  }

  getRoleMeta(role?: string): RoleMeta {
    return getRoleMeta(role || 'viewer');
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;

    const { current_password, new_password, confirm_password } = this.passwordForm.value;
    if (new_password !== confirm_password) {
      this.toast.show('New passwords do not match');
      return;
    }

    this.store.changePassword(
      { current_password, new_password },
      () => this.passwordForm.reset()
    );
  }

  startTotp(): void {
    this.totpCodeControl.reset();
    this.store.startTotpEnrol();
  }

  verifyTotp(): void {
    if (this.totpCodeControl.invalid) return;
    const code = this.totpCodeControl.value!.trim();
    this.store.verifyTotp(code, () => {
      this.totpCodeControl.reset();
    });
  }

  copySecret(secret?: string): void {
    if (!secret) return;
    navigator.clipboard?.writeText(secret).then(() => {
      this.toast.show('Secret key copied to clipboard');
    });
  }

  confirmDisableTotp(): void {
    if (confirm('Are you sure you want to disable two-factor authentication? Your account will be less secure.')) {
      this.store.disableTotp();
    }
  }

  formatTimeAgo(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${Math.max(0, diffSec)}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return dateStr;
    }
  }
}
