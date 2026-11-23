import { Injectable, signal } from '@angular/core';

export type ToastSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical';

export interface ToastItem {
  id: string;
  message: string;
  severity: ToastSeverity;
  durationMs: number;
  timestamp: number;
}

export interface ToastOptions {
  message: string;
  severity?: ToastSeverity;
  durationMs?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(
    messageOrOptions: string | ToastOptions,
    actionOrSeverity: string | ToastSeverity = 'info',
    durationMs: number = 4000
  ): void {
    let message = '';
    let severity: ToastSeverity = 'info';
    let duration = durationMs;

    if (typeof messageOrOptions === 'object') {
      message = messageOrOptions.message;
      severity = messageOrOptions.severity || 'info';
      duration = messageOrOptions.durationMs ?? 4000;
    } else {
      message = messageOrOptions;
      if (actionOrSeverity === 'error' || actionOrSeverity === 'Dismiss') {
        severity = 'error';
      } else if (actionOrSeverity === 'success' || actionOrSeverity === 'OK') {
        severity = 'success';
      } else if (actionOrSeverity === 'warning') {
        severity = 'warning';
      } else if (actionOrSeverity === 'critical') {
        severity = 'critical';
      }
    }

    const item: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      message,
      severity,
      durationMs: duration,
      timestamp: Date.now()
    };

    this.toasts.update((current) => [...current, item]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(item.id);
      }, duration);
    }
  }

  error(message: string, durationMs: number = 6000): void {
    this.show(message, 'error', durationMs);
  }

  success(message: string, durationMs: number = 4000): void {
    this.show(message, 'success', durationMs);
  }

  info(message: string, durationMs: number = 4000): void {
    this.show(message, 'info', durationMs);
  }

  warning(message: string, durationMs: number = 5000): void {
    this.show(message, 'warning', durationMs);
  }

  dismiss(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }
}
