import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminPasswordResetRequest,
  UserCreateRequest,
  UserItem,
  UsersListResponse,
  UserUpdateRequest,
} from '../models/user-mgmt.model';
import { USERS_ENDPOINTS } from '../constants/user-mgmt.constants';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  listUsers(page: number = 1, pageSize: number = 20, q?: string): Observable<UsersListResponse> {
    let params = new HttpParams().set('page', String(page)).set('page_size', String(pageSize));
    if (q && q.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<UsersListResponse>(USERS_ENDPOINTS.users, { params });
  }

  getUser(id: string): Observable<UserItem> {
    return this.http.get<UserItem>(`${USERS_ENDPOINTS.users}/${encodeURIComponent(id)}`);
  }

  createUser(data: UserCreateRequest): Observable<UserItem> {
    return this.http.post<UserItem>(USERS_ENDPOINTS.users, data);
  }

  updateUser(id: string, data: UserUpdateRequest): Observable<UserItem> {
    return this.http.put<UserItem>(`${USERS_ENDPOINTS.users}/${encodeURIComponent(id)}`, data);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${USERS_ENDPOINTS.users}/${encodeURIComponent(id)}`);
  }

  resetPassword(id: string, data: AdminPasswordResetRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${USERS_ENDPOINTS.users}/${encodeURIComponent(id)}/reset-password`,
      data
    );
  }
}
