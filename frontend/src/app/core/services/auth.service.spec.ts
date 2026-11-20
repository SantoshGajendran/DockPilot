import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from './auth.service';
import { SessionExpiredDialogComponent } from '../../features/auth/session-expired-dialog.component';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;
  let dialogMock: { open: jest.Mock; openDialogs: any[] };

  beforeEach(() => {
    dialogMock = {
      open: jest.fn(),
      openDialogs: []
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: dialogMock }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should authenticate user and set currentUser signal', () => {
    service.login({ username: 'admin', password: 'password123' }).subscribe(res => {
      expect(service.isAuthenticated()).toBe(true);
      expect(service.userRole()).toBe('admin');
      expect(service.getToken()).toBe('mock-jwt-token');
    });

    const req = httpMock.expectOne('api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      access_token: 'mock-jwt-token',
      token_type: 'bearer',
      user: { id: '1', username: 'admin', role: 'admin', is_active: true }
    });
  });

  it('should clear token and currentUser on logout and navigate to /login', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    service.setToken('mock-jwt');
    service.logout().subscribe(() => {
      expect(service.getToken()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    const req = httpMock.expectOne('api/v1/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ status: 'ok' });
  });

  it('should perform silent refresh on init', () => {
    service.init().subscribe(success => {
      expect(success).toBe(true);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getToken()).toBe('new-mock-jwt');
    });

    const req = httpMock.expectOne('api/v1/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      access_token: 'new-mock-jwt',
      token_type: 'bearer',
      user: { id: '1', username: 'admin', role: 'admin', is_active: true }
    });
  });

  it('should return false on init when silent refresh fails', () => {
    service.init().subscribe(success => {
      expect(success).toBe(false);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getToken()).toBeNull();
    });

    const req = httpMock.expectOne('api/v1/auth/refresh');
    expect(req.request.method).toBe('POST');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should clear state and emit sessionExpired$ on handleSessionExpired', (done) => {
    service.setToken('expired-jwt');
    service.sessionExpired$.subscribe(() => {
      expect(service.getToken()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      done();
    });

    service.handleSessionExpired();
  });

  it('should open SessionExpiredDialogComponent when MatDialog is provided', () => {
    service.handleSessionExpired();

    expect(dialogMock.open).toHaveBeenCalledWith(SessionExpiredDialogComponent, {
      disableClose: true,
      autoFocus: true
    });
  });

  it('should not open second dialog if SessionExpiredDialogComponent is already open', () => {
    dialogMock.openDialogs = [{ componentInstance: Object.create(SessionExpiredDialogComponent.prototype) }];
    service.handleSessionExpired();

    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('should correctly evaluate role hierarchy', () => {
    expect(service.hasRole('viewer')).toBe(false);

    service.login({ username: 'operator_user', password: 'password123' }).subscribe();
    const req = httpMock.expectOne('api/v1/auth/login');
    req.flush({
      access_token: 'mock-jwt-token',
      token_type: 'bearer',
      user: { id: '2', username: 'operator_user', role: 'operator', is_active: true }
    });

    expect(service.hasRole('viewer')).toBe(true);
    expect(service.hasRole('operator')).toBe(true);
    expect(service.hasRole('admin')).toBe(false);
  });
});
