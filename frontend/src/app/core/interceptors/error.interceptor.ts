import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { AUTH_ENDPOINTS } from '../constants/auth.constants';
import { IS_RETRY_ATTEMPT, IS_SILENT_REFRESH } from './http-context.tokens';

export { IS_RETRY_ATTEMPT, IS_SILENT_REFRESH };

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isAuthEndpoint =
        req.url.includes(AUTH_ENDPOINTS.login) ||
        req.url.includes(AUTH_ENDPOINTS.refresh) ||
        req.url.includes(AUTH_ENDPOINTS.logout) ||
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh');

      const isRetry = req.context.get(IS_RETRY_ATTEMPT);
      const isSilentRefresh = req.context.get(IS_SILENT_REFRESH);

      if (err.status === 401 && !isAuthEndpoint && !isRetry) {
        return authService.refreshSession().pipe(
          switchMap(tokenRes => {
            const retryReq = req.clone({
              context: req.context.set(IS_RETRY_ATTEMPT, true),
              setHeaders: {
                Authorization: `Bearer ${tokenRes.access_token}`
              }
            });
            return next(retryReq);
          }),
          catchError(refreshErr => {
            authService.handleSessionExpired();
            return throwError(() => refreshErr);
          })
        );
      }

      if (err.status === 401 && (isRetry || (req.url.includes('/auth/refresh') && !isSilentRefresh))) {
        authService.handleSessionExpired();
      }

      if (!req.url.includes('/auth/refresh')) {
        const msg = err.error?.detail || err.message || 'An unexpected error occurred';
        toast.error(msg);
      }

      return throwError(() => err);
    })
  );
};
