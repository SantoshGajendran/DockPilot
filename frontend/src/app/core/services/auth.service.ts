import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, of } from 'rxjs';
import { tap, map, catchError, finalize, shareReplay } from 'rxjs/operators';
import { User, UserRole } from '../models/user.model';
import { LoginRequest, TokenResponse } from '../models/auth.model';
import { AUTH_ENDPOINTS } from '../constants/auth.constants';
import { SessionExpiredDialogComponent } from '../../features/auth/session-expired-dialog.component';
import { IS_SILENT_REFRESH } from '../interceptors/http-context.tokens';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly router = inject(Router, { optional: true });
  private readonly dialog = inject(MatDialog, { optional: true });

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  readonly sessionExpired$ = new Subject<void>();

  private token: string | null = null;

  private get httpClient(): HttpClient {
    if (!this.http) {
      throw new Error('HttpClient must be provided to use AuthService HTTP methods');
    }
    return this.http;
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  hasRole(minRole: UserRole): boolean {
    const current = this.userRole();
    if (!current) return false;
    const hierarchy: Record<UserRole, number> = { viewer: 1, operator: 2, admin: 3 };
    return hierarchy[current] >= hierarchy[minRole];
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    return this.httpClient.post<TokenResponse>(AUTH_ENDPOINTS.login, credentials, { withCredentials: true }).pipe(
      tap(res => {
        this.setToken(res.access_token);
        this.currentUser.set(res.user);
      })
    );
  }

  private refreshInProgress$: Observable<TokenResponse> | null = null;

  refreshSession(): Observable<TokenResponse> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }
    this.refreshInProgress$ = this.httpClient.post<TokenResponse>(AUTH_ENDPOINTS.refresh, {}, { withCredentials: true }).pipe(
      tap(res => {
        this.setToken(res.access_token);
        this.currentUser.set(res.user);
      }),
      finalize(() => {
        this.refreshInProgress$ = null;
      }),
      shareReplay(1)
    );
    return this.refreshInProgress$;
  }

  init(): Observable<boolean> {
    const context = new HttpContext().set(IS_SILENT_REFRESH, true);
    return this.httpClient.post<TokenResponse>(AUTH_ENDPOINTS.refresh, {}, { withCredentials: true, context }).pipe(
      tap(res => {
        this.setToken(res.access_token);
        this.currentUser.set(res.user);
      }),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(AUTH_ENDPOINTS.logout, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.clearSession();
        this.router?.navigate(['/login']);
      }),
      catchError(() => {
        this.clearSession();
        this.router?.navigate(['/login']);
        return of(void 0);
      }),
      map(() => void 0)
    );
  }

  handleSessionExpired(): void {
    this.clearSession();
    this.sessionExpired$.next();
    if (this.dialog && !this.dialog.openDialogs.some(ref => ref.componentInstance instanceof SessionExpiredDialogComponent)) {
      this.dialog.open(SessionExpiredDialogComponent, {
        disableClose: true,
        autoFocus: true,
      });
    }
  }

  private clearSession(): void {
    this.setToken(null);
    this.currentUser.set(null);
  }
}
