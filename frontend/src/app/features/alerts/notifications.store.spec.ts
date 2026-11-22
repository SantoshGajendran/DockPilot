import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationsStore } from './notifications.store';
import { NotificationsService } from '../../core/services/notifications.service';
import { NotificationChannel, NotificationRoute } from '../../core/models/notifications.model';

describe('NotificationsStore', () => {
  let store: NotificationsStore;
  let mockService: any;

  const mockChannel: NotificationChannel = {
    id: 1,
    name: 'Slack Dev',
    channel_type: 'slack',
    enabled: true,
    config: {},
    has_secret: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockRoute: NotificationRoute = {
    id: 10,
    channel_id: 1,
    channel_name: 'Slack Dev',
    name: 'All Alerts',
    min_severity: 'warning',
    scope_type: 'all',
    enabled: true,
    created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockService = {
      getChannels: jest.fn().mockReturnValue(of({ channels: [mockChannel], total: 1 })),
      createChannel: jest.fn().mockReturnValue(of(mockChannel)),
      updateChannel: jest.fn().mockReturnValue(of(mockChannel)),
      deleteChannel: jest.fn().mockReturnValue(of(undefined)),
      testChannel: jest.fn().mockReturnValue(of({ success: true, message: 'Delivered', attempts: 1 })),
      getRoutes: jest.fn().mockReturnValue(of({ routes: [mockRoute], total: 1 })),
      createRoute: jest.fn().mockReturnValue(of(mockRoute)),
      updateRoute: jest.fn().mockReturnValue(of(mockRoute)),
      deleteRoute: jest.fn().mockReturnValue(of(undefined)),
      getDeliveryLogs: jest.fn().mockReturnValue(of({ logs: [], total: 0 })),
    };

    TestBed.configureTestingModule({
      providers: [
        NotificationsStore,
        { provide: NotificationsService, useValue: mockService },
      ],
    });

    store = TestBed.inject(NotificationsStore);
  });

  it('should initialize and load channels, routes, and logs', () => {
    store.init();
    expect(mockService.getChannels).toHaveBeenCalled();
    expect(mockService.getRoutes).toHaveBeenCalled();
    expect(mockService.getDeliveryLogs).toHaveBeenCalled();
    expect(store.channels().length).toBe(1);
    expect(store.routes().length).toBe(1);
  });

  it('should test channel and record result', () => {
    store.testChannel(1);
    expect(mockService.testChannel).toHaveBeenCalledWith(1);
    expect(store.testResults()[1]).toEqual({ success: true, message: 'Delivered', attempts: 1 });
  });

  it('should delete channel and remove local item', () => {
    store.channels.set([mockChannel]);
    store.deleteChannel(1);
    expect(mockService.deleteChannel).toHaveBeenCalledWith(1);
    expect(store.channels().length).toBe(0);
  });
});
