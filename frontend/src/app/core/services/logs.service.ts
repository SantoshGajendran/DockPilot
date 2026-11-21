import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LogEntry, LogFilterParams, LogSearchResponse } from '../models/logs.model';
import { CONTAINER_ENDPOINTS } from '../constants/container.constants';
import { SseService } from './sse.service';

@Injectable({ providedIn: 'root' })
export class LogsService {
  private readonly http = inject(HttpClient);
  private readonly sseService = inject(SseService);

  searchLogs(params: LogFilterParams): Observable<LogSearchResponse> {
    let httpParams = new HttpParams();

    if (params.container_ids && params.container_ids.length > 0) {
      httpParams = httpParams.set('container_ids', params.container_ids.join(','));
    }
    if (params.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params.regex !== undefined) {
      httpParams = httpParams.set('regex', params.regex.toString());
    }
    if (params.since !== undefined) {
      httpParams = httpParams.set('since', params.since.toString());
    }
    if (params.until !== undefined) {
      httpParams = httpParams.set('until', params.until.toString());
    }
    if (params.tail !== undefined) {
      httpParams = httpParams.set('tail', params.tail.toString());
    }

    return this.http.get<LogSearchResponse>(CONTAINER_ENDPOINTS.searchLogs, {
      params: httpParams,
    });
  }

  streamContainerLogs(containerId: string, tail: number = 200): Observable<LogEntry> {
    const url = CONTAINER_ENDPOINTS.containerLogs(containerId, tail, true);
    return this.sseService.connect<LogEntry>(url);
  }
}
