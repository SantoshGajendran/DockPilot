import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuditFilterParams, AuditLog, AuditLogsListResponse } from '../models/audit.model';
import { AUDIT_ENDPOINTS } from '../constants/audit.constants';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  private buildParams(filters?: AuditFilterParams): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;

    if (filters.user) params = params.set('user', filters.user);
    if (filters.action) params = params.set('action', filters.action);
    if (filters.target_type) params = params.set('target_type', filters.target_type);
    if (filters.target_id) params = params.set('target_id', filters.target_id);
    if (filters.result) params = params.set('result', filters.result);
    if (filters.since) params = params.set('since', filters.since);
    if (filters.until) params = params.set('until', filters.until);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.page_size) params = params.set('page_size', String(filters.page_size));
    if (filters.sort_order) params = params.set('sort_order', filters.sort_order);

    return params;
  }

  listAuditLogs(filters?: AuditFilterParams): Observable<AuditLogsListResponse> {
    const params = this.buildParams(filters);
    return this.http.get<AuditLogsListResponse>(AUDIT_ENDPOINTS.audit, { params });
  }

  getAuditLog(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${AUDIT_ENDPOINTS.audit}/${encodeURIComponent(id)}`);
  }

  exportAuditCsv(filters?: AuditFilterParams): Observable<Blob> {
    const params = this.buildParams(filters);
    return this.http.get(AUDIT_ENDPOINTS.export, {
      params,
      responseType: 'blob',
    });
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
