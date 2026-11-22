import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import {
  TerminalStatus,
  TerminalSessionsListResponse,
} from '../models/terminal.model';
import { TERMINAL_ENDPOINTS } from '../constants/terminal.constants';

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getStatus(containerId: string): Observable<TerminalStatus> {
    return this.http.get<TerminalStatus>(TERMINAL_ENDPOINTS.status(containerId));
  }

  getSessions(containerId: string): Observable<TerminalSessionsListResponse> {
    return this.http.get<TerminalSessionsListResponse>(TERMINAL_ENDPOINTS.sessions(containerId));
  }

  buildWebSocketUrl(containerId: string, shell: string): string {
    const token = this.authService.getToken() || '';
    return TERMINAL_ENDPOINTS.execWs(containerId, token, shell);
  }

  createWebSocket(containerId: string, shell: string): WebSocket {
    const url = this.buildWebSocketUrl(containerId, shell);
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    return ws;
  }
}
