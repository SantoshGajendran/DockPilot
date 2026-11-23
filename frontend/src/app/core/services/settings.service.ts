import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  RetentionRunResponse,
  SettingsResponse,
  SettingsUpdateRequest,
  StorageUsageResponse,
} from '../models/settings.model';
import { SETTINGS_ENDPOINTS } from '../constants/settings.constants';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly http = inject(HttpClient);

  getSettings(): Observable<SettingsResponse> {
    return this.http.get<SettingsResponse>(SETTINGS_ENDPOINTS.settings);
  }

  updateSettings(payload: SettingsUpdateRequest): Observable<SettingsResponse> {
    return this.http.put<SettingsResponse>(SETTINGS_ENDPOINTS.settings, payload);
  }

  getStorageUsage(): Observable<StorageUsageResponse> {
    return this.http.get<StorageUsageResponse>(SETTINGS_ENDPOINTS.storage);
  }

  runRetention(): Observable<RetentionRunResponse> {
    return this.http.post<RetentionRunResponse>(SETTINGS_ENDPOINTS.retentionRun, {});
  }
}
