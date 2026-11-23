import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GlassPanelComponent } from '../../shared/components/glass-panel/glass-panel.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SkeletonShimmerComponent } from '../../shared/components/skeleton-shimmer/skeleton-shimmer.component';
import { MagneticHoverDirective } from '../../shared/directives/magnetic-hover.directive';

@Component({
  selector: 'dp-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GlassPanelComponent,
    IconComponent,
    SkeletonShimmerComponent,
    MagneticHoverDirective
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    totpCode: ['']
  });

  readonly isLoading = signal<boolean>(false);
  readonly hidePassword = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly isSuccess = signal<boolean>(false);
  readonly currentStage = signal<'credentials' | 'totp'>('credentials');
  readonly isOffline = signal<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.isOffline.set(false));
      window.addEventListener('offline', () => this.isOffline.set(true));
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update((val) => !val);
  }

  showTotpStage(): void {
    if (this.loginForm.get('username')?.valid && this.loginForm.get('password')?.valid) {
      this.currentStage.set('totp');
      this.errorMessage.set(null);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  backToCredentials(): void {
    this.currentStage.set('credentials');
  }

  onSubmit(): void {
    if (this.loginForm.get('username')?.invalid || this.loginForm.get('password')?.invalid || this.isLoading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, password, totpCode } = this.loginForm.value;
    const credentials: { username: string; password: string; totp_code?: string } = { username, password };
    if (totpCode) {
      credentials.totp_code = totpCode;
    }

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err?.error?.detail || 'Invalid username or password';
        this.errorMessage.set(detail);
      }
    });
  }
}
