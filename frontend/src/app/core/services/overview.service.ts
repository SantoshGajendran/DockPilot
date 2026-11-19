import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';
import { OverviewResponse } from '../models/overview.model';
import { OVERVIEW_ENDPOINTS } from '../constants/overview.constants';

@Injectable({ providedIn: 'root' })
export class OverviewService {
  private readonly http = inject(HttpClient);
  private readonly sseService = inject(SseService);

  getOverview(): Observable<OverviewResponse> {
    return this.http.get<OverviewResponse>(OVERVIEW_ENDPOINTS.overview);
  }

  getOverviewStream(): Observable<OverviewResponse> {
    return this.sseService.connect<OverviewResponse>(OVERVIEW_ENDPOINTS.stream);
  }
}
