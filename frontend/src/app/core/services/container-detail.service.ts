import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ContainerDetail,
  ContainerLiveStats,
  ContainerMetricsHistoryResponse,
  EnvRevealResponse,
} from '../models/container-detail.model';
import { CONTAINER_ENDPOINTS } from '../constants/container.constants';
import { SseService } from './sse.service';

@Injectable({ providedIn: 'root' })
export class ContainersDetailService {
  private readonly http = inject(HttpClient);
  private readonly sseService = inject(SseService);

  getContainerDetail(id: string): Observable<ContainerDetail> {
    return this.http.get<ContainerDetail>(CONTAINER_ENDPOINTS.detail(id));
  }

  revealEnv(id: string): Observable<EnvRevealResponse> {
    return this.http.post<EnvRevealResponse>(CONTAINER_ENDPOINTS.revealEnv(id), {});
  }

  getMetricsHistory(id: string, range: string): Observable<ContainerMetricsHistoryResponse> {
    return this.http.get<ContainerMetricsHistoryResponse>(
      CONTAINER_ENDPOINTS.detailMetrics(id, range)
    );
  }

  getStatsStream(id: string): Observable<ContainerLiveStats> {
    return this.sseService.connect<ContainerLiveStats>(CONTAINER_ENDPOINTS.detailStats(id));
  }

  executeAction(id: string, action: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(CONTAINER_ENDPOINTS.action(id, action), {});
  }
}
