import { Injectable, inject, signal } from '@angular/core';
import {
  ChangePasswordRequest,
  TotpEnrolResponse,
  UserSession,
} from '../../core/models/user-mgmt.model';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

@Injectable()
export class ProfileStore {
  private readonly profileService = inject(ProfileService);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);

  readonly sessions = signal<UserSession[]>([]);
  readonly isLoadingSessions = signal<boolean>(false);
  readonly totpEnrolData = signal<TotpEnrolResponse | null>(null);
  readonly isEnrollingTotp = signal<boolean>(false);
  readonly isVerifyingTotp = signal<boolean>(false);
  readonly isChangingPassword = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  init(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.isLoadingSessions.set(true);
    this.profileService.listSessions().subscribe({
      next: (resp) => {
        this.sessions.set(resp?.items || []);
        this.isLoadingSessions.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.message || 'Failed to load sessions');
        this.isLoadingSessions.set(false);
      },
    });
  }

  revokeSession(sessionId: string): void {
    this.profileService.revokeSession(sessionId).subscribe({
      next: () => {
        this.toast.show('Session revoked');
        this.loadSessions();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to revoke session');
      },
    });
  }

  revokeAllSessions(): void {
    this.profileService.revokeAllSessions().subscribe({
      next: () => {
        this.toast.show('All other sessions revoked');
        this.loadSessions();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to revoke sessions');
      },
    });
  }

  startTotpEnrol(): void {
    this.isEnrollingTotp.set(true);
    this.profileService.enrolTotp().subscribe({
      next: (resp) => {
        this.totpEnrolData.set(resp);
        this.isEnrollingTotp.set(false);
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to enrol 2FA');
        this.isEnrollingTotp.set(false);
      },
    });
  }

  cancelTotpEnrol(): void {
    this.totpEnrolData.set(null);
  }

  verifyTotp(code: string, onSuccess?: () => void): void {
    this.isVerifyingTotp.set(true);
    this.profileService.verifyTotp(code).subscribe({
      next: () => {
        this.toast.show('Two-factor authentication enabled successfully');
        this.totpEnrolData.set(null);
        this.isVerifyingTotp.set(false);
        // Refresh currentUser in AuthService so totp_enabled becomes true
        this.authService.refreshSession().subscribe();
        onSuccess?.();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Invalid verification code');
        this.isVerifyingTotp.set(false);
      },
    });
  }

  disableTotp(onSuccess?: () => void): void {
    this.profileService.disableTotp().subscribe({
      next: () => {
        this.toast.show('Two-factor authentication disabled');
        this.authService.refreshSession().subscribe();
        onSuccess?.();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to disable 2FA');
      },
    });
  }

  changePassword(data: ChangePasswordRequest, onSuccess?: () => void): void {
    this.isChangingPassword.set(true);
    this.profileService.changePassword(data).subscribe({
      next: () => {
        this.toast.show('Password changed successfully');
        this.isChangingPassword.set(false);
        this.authService.refreshSession().subscribe();
        onSuccess?.();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to change password');
        this.isChangingPassword.set(false);
      },
    });
  }
}
