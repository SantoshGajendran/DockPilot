import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DockerDiskUsage,
  HostHistoryResponse,
  HostInfo,
  HostLiveMetrics,
} from '../models/host.model';
import { HOST_ENDPOINTS } from '../constants/host.constants';

@Injectable({ providedIn: 'root' })
export class HostService {
  private readonly http = inject(HttpClient);

  getHostInfo(): Observable<HostInfo> {
    return this.http.get<HostInfo>(HOST_ENDPOINTS.info);
  }

  getLiveMetrics(): Observable<HostLiveMetrics> {
    return this.http.get<HostLiveMetrics>(HOST_ENDPOINTS.metrics);
  }

  getMetricsHistory(range: string = '1h'): Observable<HostHistoryResponse> {
    return this.http.get<HostHistoryResponse>(HOST_ENDPOINTS.history(range));
  }

  getDockerDiskUsage(): Observable<DockerDiskUsage> {
    return this.http.get<DockerDiskUsage>(HOST_ENDPOINTS.dockerUsage);
  }
}
