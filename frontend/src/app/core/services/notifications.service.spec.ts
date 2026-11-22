import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_ENDPOINTS } from '../constants/notifications.constants';
import { NotificationChannel } from '../models/notifications.model';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpMock: HttpTestingController;

  const sampleChannel: NotificationChannel = {
    id: 1,
    name: 'Slack Alerts',
    channel_type: 'slack',
    enabled: true,
    config: {},
    has_secret: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationsService],
    });
    service = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch channels', () => {
    service.getChannels().subscribe((res) => {
      expect(res.channels.length).toBe(1);
      expect(res.total).toBe(1);
    });

    const req = httpMock.expectOne(NOTIFICATION_ENDPOINTS.channels);
    expect(req.request.method).toBe('GET');
    req.flush({ channels: [sampleChannel], total: 1 });
  });

  it('should create channel', () => {
    const payload = {
      name: 'Telegram Ops',
      channel_type: 'telegram' as const,
      config: { chat_id: '-123' },
      secret: 'bot-token',
    };

    service.createChannel(payload).subscribe((res) => {
      expect(res.id).toBe(2);
      expect(res.has_secret).toBe(true);
    });

    const req = httpMock.expectOne(NOTIFICATION_ENDPOINTS.channels);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 2, ...payload, has_secret: true });
  });

  it('should test channel', () => {
    service.testChannel(1).subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpMock.expectOne(`${NOTIFICATION_ENDPOINTS.channels}/1/test`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'Delivered', attempts: 1 });
  });

  it('should get routes and delivery logs', () => {
    service.getRoutes().subscribe((res) => {
      expect(res.routes).toEqual([]);
    });
    const req1 = httpMock.expectOne(NOTIFICATION_ENDPOINTS.routes);
    req1.flush({ routes: [], total: 0 });

    service.getDeliveryLogs(1, 'delivered').subscribe((res) => {
      expect(res.logs).toEqual([]);
    });
    const req2 = httpMock.expectOne(`${NOTIFICATION_ENDPOINTS.deliveryLog}?limit=50&offset=0&channel_id=1&status=delivered`);
    req2.flush({ logs: [], total: 0 });
  });
});
