import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AlertsService } from './alerts.service';
import { ALERTS_ENDPOINTS } from '../constants/alerts.constants';
import { AlertRule, AlertEvent } from '../models/alerts.model';

describe('AlertsService', () => {
  let service: AlertsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AlertsService],
    });
    service = TestBed.inject(AlertsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get rules', () => {
    const mockRules: AlertRule[] = [
      {
        id: 1,
        name: 'Container Down',
        rule_type: 'container_down',
        scope_type: 'all',
        severity: 'critical',
        duration_minutes: 0,
        cooldown_minutes: 15,
        enabled: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];

    service.getRules().subscribe((res) => {
      expect(res.rules.length).toBe(1);
      expect(res.total).toBe(1);
    });

    const req = httpMock.expectOne(ALERTS_ENDPOINTS.rules);
    expect(req.request.method).toBe('GET');
    req.flush({ rules: mockRules, total: 1 });
  });

  it('should get single rule by id', () => {
    service.getRule(1).subscribe((rule) => {
      expect(rule.id).toBe(1);
    });

    const req = httpMock.expectOne(`${ALERTS_ENDPOINTS.rules}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, name: 'Rule 1' });
  });

  it('should create rule', () => {
    const payload = {
      name: 'New Rule',
      rule_type: 'cpu_high',
      scope_type: 'all' as const,
      severity: 'warning' as const,
      duration_minutes: 5,
      cooldown_minutes: 15,
      enabled: true,
    };

    service.createRule(payload).subscribe((res) => {
      expect(res.id).toBe(2);
      expect(res.name).toBe('New Rule');
    });

    const req = httpMock.expectOne(ALERTS_ENDPOINTS.rules);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 2, ...payload });
  });

  it('should acknowledge event', () => {
    service.acknowledgeEvent(10).subscribe((res) => {
      expect(res.id).toBe(10);
      expect(res.acknowledged_by).toBe('operator');
    });

    const req = httpMock.expectOne(`${ALERTS_ENDPOINTS.events}/10/ack`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 10, acknowledged_by: 'operator' });
  });

  it('should get active count', () => {
    service.getActiveCount().subscribe((res) => {
      expect(res.active_count).toBe(3);
    });

    const req = httpMock.expectOne(ALERTS_ENDPOINTS.activeCount);
    expect(req.request.method).toBe('GET');
    req.flush({ active_count: 3 });
  });
});
