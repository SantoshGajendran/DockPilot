import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ComposeActionResponse,
  ComposeJob,
  ComposeProjectsListResponse,
  JobStreamEvent,
} from '../models/compose.model';
import { COMPOSE_ENDPOINTS } from '../constants/compose.constants';
import { SseService } from './sse.service';

@Injectable({ providedIn: 'root' })
export class ComposeService {
  private readonly http = inject(HttpClient);
  private readonly sseService = inject(SseService);

  getProjects(): Observable<ComposeProjectsListResponse> {
    return this.http.get<ComposeProjectsListResponse>(COMPOSE_ENDPOINTS.projects);
  }

  executeAction(name: string, action: string): Observable<ComposeActionResponse> {
    return this.http.post<ComposeActionResponse>(COMPOSE_ENDPOINTS.action(name, action), {});
  }

  getJob(id: string): Observable<ComposeJob> {
    return this.http.get<ComposeJob>(COMPOSE_ENDPOINTS.job(id));
  }

  streamJob(id: string): Observable<JobStreamEvent> {
    return this.sseService.connect<JobStreamEvent>(COMPOSE_ENDPOINTS.jobStream(id));
  }
}
