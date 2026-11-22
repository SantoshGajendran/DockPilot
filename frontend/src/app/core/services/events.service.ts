import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventItem, EventsFilter, EventsListResponse } from '../models/events.model';
import { EVENTS_ENDPOINTS } from '../constants/events.constants';
import { SseService } from './sse.service';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly sseService = inject(SseService);

  getEvents(filters?: EventsFilter): Observable<EventsListResponse> {
    let params = new HttpParams();
    if (filters) {
      if (filters.container_id) params = params.set('container_id', filters.container_id);
      if (filters.container_name) params = params.set('container_name', filters.container_name);
      if (filters.action) params = params.set('action', filters.action);
      if (filters.incidents_only !== undefined && filters.incidents_only !== null) {
        params = params.set('incidents_only', String(filters.incidents_only));
      }
      if (filters.since) params = params.set('since', filters.since);
      if (filters.until) params = params.set('until', filters.until);
      if (filters.limit) params = params.set('limit', String(filters.limit));
      if (filters.cursor) params = params.set('cursor', filters.cursor);
    }
    return this.http.get<EventsListResponse>(EVENTS_ENDPOINTS.events, { params });
  }

  streamEvents(): Observable<EventItem> {
    return this.sseService.connect<EventItem>(EVENTS_ENDPOINTS.stream);
  }
}
