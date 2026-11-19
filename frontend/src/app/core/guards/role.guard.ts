import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const minRole = route.data?.['role'] as UserRole;
  if (!minRole || authService.hasRole(minRole)) {
    return true;
  }
  return router.parseUrl('/dashboard');
};
