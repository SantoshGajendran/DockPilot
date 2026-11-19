import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

describe('roleGuard', () => {
  let authServiceSpy: { hasRole: jest.Mock };
  let router: Router;

  beforeEach(() => {
    authServiceSpy = {
      hasRole: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    router = TestBed.inject(Router);
  });

  it('should allow access if no role is required on route', () => {
    const route = { data: {} } as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(route, state));

    expect(result).toBe(true);
    expect(authServiceSpy.hasRole).not.toHaveBeenCalled();
  });

  it('should allow access when user has the required role', () => {
    authServiceSpy.hasRole.mockReturnValue(true);
    const route = { data: { role: 'operator' as UserRole } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/containers' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(route, state));

    expect(result).toBe(true);
    expect(authServiceSpy.hasRole).toHaveBeenCalledWith('operator');
  });

  it('should allow access when user has a higher role in hierarchy', () => {
    authServiceSpy.hasRole.mockReturnValue(true);
    const route = { data: { role: 'viewer' as UserRole } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/metrics' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(route, state));

    expect(result).toBe(true);
    expect(authServiceSpy.hasRole).toHaveBeenCalledWith('viewer');
  });

  it('should redirect to /dashboard when user does not have sufficient role', () => {
    authServiceSpy.hasRole.mockReturnValue(false);
    const route = { data: { role: 'admin' as UserRole } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/settings' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => roleGuard(route, state)) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result)).toBe('/dashboard');
    expect(authServiceSpy.hasRole).toHaveBeenCalledWith('admin');
  });
});
