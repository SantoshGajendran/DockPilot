import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BulkActionRequest,
  BulkActionResponse,
  ContainerFilterParams,
  ContainerLiveMetrics,
  ContainersListResponse,
  DeleteTokenResponse,
} from '../models/container.model';
import { CONTAINER_ENDPOINTS } from '../constants/container.constants';
import { SseService } from './sse.service';

@Injectable({ providedIn: 'root' })
export class ContainersService {
  private readonly http = inject(HttpClient);
  private readonly sseService = inject(SseService);

  listContainers(params?: ContainerFilterParams): Observable<ContainersListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.state) httpParams = httpParams.set('state', params.state);
      if (params.health) httpParams = httpParams.set('health', params.health);
      if (params.compose_project) httpParams = httpParams.set('compose_project', params.compose_project);
      if (params.label) httpParams = httpParams.set('label', params.label);
      if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);
      if (params.sort_order) httpParams = httpParams.set('sort_order', params.sort_order);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.page_size !== undefined) httpParams = httpParams.set('page_size', params.page_size.toString());
    }
    return this.http.get<ContainersListResponse>(CONTAINER_ENDPOINTS.list, { params: httpParams });
  }

  executeAction(id: string, action: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(CONTAINER_ENDPOINTS.action(id, action), {});
  }

  bulkAction(action: string, containerIds: string[]): Observable<BulkActionResponse> {
    const body: BulkActionRequest = { action, container_ids: containerIds };
    return this.http.post<BulkActionResponse>(CONTAINER_ENDPOINTS.bulk, body);
  }

  getDeleteToken(id: string): Observable<DeleteTokenResponse> {
    return this.http.post<DeleteTokenResponse>(CONTAINER_ENDPOINTS.deleteToken(id), {});
  }

  deleteContainer(id: string, token: string): Observable<{ message: string }> {
    const params = new HttpParams().set('token', token);
    return this.http.delete<{ message: string }>(CONTAINER_ENDPOINTS.delete(id), { params });
  }

  getContainersStream(): Observable<ContainerLiveMetrics[]> {
    return this.sseService.connect<ContainerLiveMetrics[]>(CONTAINER_ENDPOINTS.stream);
  }
}
