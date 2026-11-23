import { Injectable, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SseConnectionState } from '../models/sse-status.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly authService = inject(AuthService, { optional: true });
  readonly connectionState = signal<SseConnectionState>('disconnected');
  private eventSource: EventSource | null = null;
  private retryCount = 0;

  computeBackoffDelay(retry: number): number {
    const base = 1000;
    const factor = 1.5;
    const max = 30000;
    return Math.min(base * Math.pow(factor, retry), max);
  }

  connect<T>(url: string): Observable<T> {
    return new Observable<T>(observer => {
      let streamUrl = url;
      const token = this.authService?.getToken();
      if (token && !streamUrl.includes('token=')) {
        const separator = streamUrl.includes('?') ? '&' : '?';
        streamUrl = `${streamUrl}${separator}token=${encodeURIComponent(token)}`;
      }
      this.eventSource = new EventSource(streamUrl);
      this.connectionState.set('connected');

      this.eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          observer.next(parsed);
        } catch {
          observer.next(event.data as unknown as T);
        }
      };

      this.eventSource.onerror = () => {
        this.connectionState.set('reconnecting');
        this.eventSource?.close();
        this.retryCount++;
      };

      return () => {
        this.eventSource?.close();
        this.connectionState.set('disconnected');
        this.retryCount = 0;
      };
    });
  }
}
