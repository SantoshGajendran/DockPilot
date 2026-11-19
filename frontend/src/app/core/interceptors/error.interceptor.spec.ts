import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let toastService: { error: jest.Mock };
  let authService: {
    refreshSession: jest.Mock;
    handleSessionExpired: jest.Mock;
  };

  beforeEach(() => {
    toastService = { error: jest.fn() };
    authService = {
      refreshSession: jest.fn(),
      handleSessionExpired: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: toastService },
        { provide: AuthService, useValue: authService }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass through successful requests', () => {
    httpClient.get('/api/v1/test').subscribe(res => {
      expect(res).toEqual({ ok: true });
    });

    const req = httpMock.expectOne('/api/v1/test');
    req.flush({ ok: true });
    expect(toastService.error).not.toHaveBeenCalled();
  });

  it('should toast and rethrow non-401 errors', () => {
    httpClient.get('/api/v1/test').subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
      }
    });

    const req = httpMock.expectOne('/api/v1/test');
    req.flush({ detail: 'Internal Server Error' }, { status: 500, statusText: 'Server Error' });

    expect(toastService.error).toHaveBeenCalledWith('Internal Server Error');
    expect(authService.refreshSession).not.toHaveBeenCalled();
  });

  it('should attempt refresh and retry request on 401 for non-auth endpoints', () => {
    authService.refreshSession.mockReturnValue(of({
      access_token: 'new-access-token',
      token_type: 'bearer',
      user: { id: '1', username: 'admin', role: 'admin', is_active: true }
    }));

    let responseData: any;
    httpClient.get('/api/v1/containers').subscribe(res => {
      responseData = res;
    });

    // First attempt fails with 401
    const firstReq = httpMock.expectOne('/api/v1/containers');
    firstReq.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).toHaveBeenCalled();

    // Retried attempt with new token
    const retryReq = httpMock.expectOne('/api/v1/containers');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-access-token');
    retryReq.flush([{ id: 'c1', name: 'web' }]);

    expect(responseData).toEqual([{ id: 'c1', name: 'web' }]);
    expect(toastService.error).not.toHaveBeenCalled();
  });

  it('should invoke handleSessionExpired when refresh fails on 401 retry', () => {
    authService.refreshSession.mockReturnValue(throwError(() => ({
      status: 401,
      message: 'Refresh failed'
    })));

    httpClient.get('/api/v1/containers').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/api/v1/containers');
    req.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).toHaveBeenCalled();
    expect(authService.handleSessionExpired).toHaveBeenCalled();
  });

  it('should not attempt refresh on 401 from /auth/login and should toast error', () => {
    httpClient.post('/api/v1/auth/login', { username: 'admin', password: 'bad' }).subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/api/v1/auth/login');
    req.flush({ detail: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).not.toHaveBeenCalled();
    expect(toastService.error).toHaveBeenCalledWith('Invalid credentials');
  });

  it('should not toast error on 401 from /auth/refresh and should invoke handleSessionExpired', () => {
    httpClient.post('/api/v1/auth/refresh', {}).subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/api/v1/auth/refresh');
    req.flush({ detail: 'Refresh token missing' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshSession).not.toHaveBeenCalled();
    expect(toastService.error).not.toHaveBeenCalled();
    expect(authService.handleSessionExpired).toHaveBeenCalled();
  });
});
