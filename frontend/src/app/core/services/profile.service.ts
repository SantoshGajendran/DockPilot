import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ChangePasswordRequest,
  TotpEnrolResponse,
  UserSessionsListResponse,
} from '../models/user-mgmt.model';
import { USERS_ENDPOINTS } from '../constants/user-mgmt.constants';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(USERS_ENDPOINTS.changePassword, data);
  }

  enrolTotp(): Observable<TotpEnrolResponse> {
    return this.http.post<TotpEnrolResponse>(USERS_ENDPOINTS.totpEnrol, {});
  }

  verifyTotp(code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(USERS_ENDPOINTS.totpVerify, { code });
  }

  disableTotp(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(USERS_ENDPOINTS.totpDisable, {});
  }

  listSessions(): Observable<UserSessionsListResponse> {
    return this.http.get<UserSessionsListResponse>(USERS_ENDPOINTS.sessions);
  }

  revokeSession(sessionId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${USERS_ENDPOINTS.sessions}/${encodeURIComponent(sessionId)}/revoke`,
      {}
    );
  }

  revokeAllSessions(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(USERS_ENDPOINTS.revokeAll, {});
  }
}
