import { Injectable, inject, signal } from '@angular/core';
import {
  DeliveryLogListResponse,
  NotificationChannel,
  NotificationChannelCreate,
  NotificationChannelUpdate,
  NotificationDeliveryLog,
  NotificationRoute,
  NotificationRouteCreate,
  NotificationRouteUpdate,
  NotificationTestResult,
} from '../../core/models/notifications.model';
import { NotificationsService } from '../../core/services/notifications.service';

@Injectable()
export class NotificationsStore {
  private readonly service = inject(NotificationsService);

  readonly channels = signal<NotificationChannel[]>([]);
  readonly channelsLoading = signal<boolean>(false);
  readonly channelsError = signal<string | null>(null);

  readonly routes = signal<NotificationRoute[]>([]);
  readonly routesLoading = signal<boolean>(false);
  readonly routesError = signal<string | null>(null);

  readonly logs = signal<NotificationDeliveryLog[]>([]);
  readonly logsTotal = signal<number>(0);
  readonly logsLoading = signal<boolean>(false);
  readonly logsError = signal<string | null>(null);

  readonly selectedChannelFilter = signal<number | null>(null);
  readonly selectedStatusFilter = signal<string | null>(null);

  readonly testingChannelId = signal<number | null>(null);
  readonly testResults = signal<Record<number, NotificationTestResult>>({});

  init(): void {
    this.loadChannels();
    this.loadRoutes();
    this.loadLogs();
  }

  loadChannels(): void {
    this.channelsLoading.set(true);
    this.channelsError.set(null);
    this.service.getChannels().subscribe({
      next: (res) => {
        this.channels.set(res.channels);
        this.channelsLoading.set(false);
      },
      error: (err) => {
        this.channelsError.set(err?.message || 'Failed to load notification channels');
        this.channelsLoading.set(false);
      },
    });
  }

  createChannel(channel: NotificationChannelCreate, onSuccess?: () => void): void {
    this.channelsLoading.set(true);
    this.service.createChannel(channel).subscribe({
      next: () => {
        this.loadChannels();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.channelsError.set(err?.message || 'Failed to create channel');
        this.channelsLoading.set(false);
      },
    });
  }

  updateChannel(id: number, channel: NotificationChannelUpdate, onSuccess?: () => void): void {
    this.channelsLoading.set(true);
    this.service.updateChannel(id, channel).subscribe({
      next: () => {
        this.loadChannels();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.channelsError.set(err?.message || 'Failed to update channel');
        this.channelsLoading.set(false);
      },
    });
  }

  deleteChannel(id: number): void {
    this.service.deleteChannel(id).subscribe({
      next: () => {
        this.channels.update((prev) => prev.filter((c) => c.id !== id));
        this.routes.update((prev) => prev.filter((r) => r.channel_id !== id));
      },
      error: (err) => {
        this.channelsError.set(err?.message || 'Failed to delete channel');
      },
    });
  }

  testChannel(id: number): void {
    this.testingChannelId.set(id);
    this.service.testChannel(id).subscribe({
      next: (res) => {
        this.testResults.update((prev) => ({ ...prev, [id]: res }));
        this.testingChannelId.set(null);
        this.loadLogs();
      },
      error: (err) => {
        this.testResults.update((prev) => ({
          ...prev,
          [id]: { success: false, message: err?.message || 'Test failed', attempts: 1 },
        }));
        this.testingChannelId.set(null);
        this.loadLogs();
      },
    });
  }

  loadRoutes(): void {
    this.routesLoading.set(true);
    this.routesError.set(null);
    this.service.getRoutes().subscribe({
      next: (res) => {
        this.routes.set(res.routes);
        this.routesLoading.set(false);
      },
      error: (err) => {
        this.routesError.set(err?.message || 'Failed to load notification routes');
        this.routesLoading.set(false);
      },
    });
  }

  createRoute(route: NotificationRouteCreate, onSuccess?: () => void): void {
    this.routesLoading.set(true);
    this.service.createRoute(route).subscribe({
      next: () => {
        this.loadRoutes();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.routesError.set(err?.message || 'Failed to create route');
        this.routesLoading.set(false);
      },
    });
  }

  updateRoute(id: number, route: NotificationRouteUpdate, onSuccess?: () => void): void {
    this.routesLoading.set(true);
    this.service.updateRoute(id, route).subscribe({
      next: () => {
        this.loadRoutes();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.routesError.set(err?.message || 'Failed to update route');
        this.routesLoading.set(false);
      },
    });
  }

  deleteRoute(id: number): void {
    this.service.deleteRoute(id).subscribe({
      next: () => {
        this.routes.update((prev) => prev.filter((r) => r.id !== id));
      },
      error: (err) => {
        this.routesError.set(err?.message || 'Failed to delete route');
      },
    });
  }

  loadLogs(): void {
    this.logsLoading.set(true);
    this.logsError.set(null);
    const channelId = this.selectedChannelFilter() || undefined;
    const status = this.selectedStatusFilter() || undefined;

    this.service.getDeliveryLogs(channelId, status).subscribe({
      next: (res) => {
        this.logs.set(res.logs);
        this.logsTotal.set(res.total);
        this.logsLoading.set(false);
      },
      error: (err) => {
        this.logsError.set(err?.message || 'Failed to load delivery logs');
        this.logsLoading.set(false);
      },
    });
  }

  setChannelFilter(channelId: number | null): void {
    this.selectedChannelFilter.set(channelId);
    this.loadLogs();
  }

  setStatusFilter(status: string | null): void {
    this.selectedStatusFilter.set(status);
    this.loadLogs();
  }
}
