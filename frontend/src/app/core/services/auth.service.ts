import { Injectable, signal, computed } from '@angular/core';
import { User, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRole = computed<UserRole | null>(() => this.currentUser()?.role ?? null);
  private token: string | null = null;

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
}
