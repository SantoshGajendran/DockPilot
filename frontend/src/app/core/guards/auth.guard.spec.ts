import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authServiceSpy: { isAuthenticated: jest.Mock };
  let router: Router;

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    router = TestBed.inject(Router);
  });

  it('should allow access when user is authenticated', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/dashboard' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBe(true);
  });

  it('should redirect unauthenticated user to /login with returnUrl query param', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/containers' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.queryParams['returnUrl']).toBe('/containers');
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fcontainers');
  });

  it('should redirect unauthenticated user to /login when state has no returnUrl target', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result)).toBe('/login');
  });
});
