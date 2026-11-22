import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DeliveryLogListResponse,
  NotificationChannel,
  NotificationChannelCreate,
  NotificationChannelsListResponse,
  NotificationChannelUpdate,
  NotificationRoute,
  NotificationRouteCreate,
  NotificationRoutesListResponse,
  NotificationRouteUpdate,
  NotificationTestResult,
} from '../models/notifications.model';
import { NOTIFICATION_ENDPOINTS } from '../constants/notifications.constants';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);

  // Channels
  getChannels(): Observable<NotificationChannelsListResponse> {
    return this.http.get<NotificationChannelsListResponse>(NOTIFICATION_ENDPOINTS.channels);
  }

  getChannel(id: number): Observable<NotificationChannel> {
    return this.http.get<NotificationChannel>(`${NOTIFICATION_ENDPOINTS.channels}/${id}`);
  }

  createChannel(channel: NotificationChannelCreate): Observable<NotificationChannel> {
    return this.http.post<NotificationChannel>(NOTIFICATION_ENDPOINTS.channels, channel);
  }

  updateChannel(id: number, channel: NotificationChannelUpdate): Observable<NotificationChannel> {
    return this.http.put<NotificationChannel>(`${NOTIFICATION_ENDPOINTS.channels}/${id}`, channel);
  }

  deleteChannel(id: number): Observable<void> {
    return this.http.delete<void>(`${NOTIFICATION_ENDPOINTS.channels}/${id}`);
  }

  testChannel(id: number): Observable<NotificationTestResult> {
    return this.http.post<NotificationTestResult>(`${NOTIFICATION_ENDPOINTS.channels}/${id}/test`, {});
  }

  // Routes
  getRoutes(): Observable<NotificationRoutesListResponse> {
    return this.http.get<NotificationRoutesListResponse>(NOTIFICATION_ENDPOINTS.routes);
  }

  createRoute(route: NotificationRouteCreate): Observable<NotificationRoute> {
    return this.http.post<NotificationRoute>(NOTIFICATION_ENDPOINTS.routes, route);
  }

  updateRoute(id: number, route: NotificationRouteUpdate): Observable<NotificationRoute> {
    return this.http.put<NotificationRoute>(`${NOTIFICATION_ENDPOINTS.routes}/${id}`, route);
  }

  deleteRoute(id: number): Observable<void> {
    return this.http.delete<void>(`${NOTIFICATION_ENDPOINTS.routes}/${id}`);
  }

  // Delivery Logs
  getDeliveryLogs(
    channelId?: number,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Observable<DeliveryLogListResponse> {
    let params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));
    if (channelId !== undefined && channelId !== null) {
      params = params.set('channel_id', String(channelId));
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<DeliveryLogListResponse>(NOTIFICATION_ENDPOINTS.deliveryLog, { params });
  }
}
