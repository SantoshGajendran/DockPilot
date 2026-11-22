import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertsStore } from './alerts.store';
import { AlertsService } from '../../core/services/alerts.service';
import { AlertRule, AlertEvent } from '../../core/models/alerts.model';

describe('AlertsStore', () => {
  let store: AlertsStore;
  let mockAlertsService: any;

  const sampleRules: AlertRule[] = [
    {
      id: 1,
      name: 'Down Rule',
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

  const sampleEvents: AlertEvent[] = [
    {
      id: 10,
      rule_id: 1,
      rule_name: 'Down Rule',
      rule_type: 'container_down',
      severity: 'critical',
      target_type: 'container',
      target_id: 'c1',
      target_name: 'redis',
      status: 'firing',
      message: 'Container exited',
      started_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    mockAlertsService = {
      getRules: jest.fn().mockReturnValue(of({ rules: sampleRules, total: 1 })),
      createRule: jest.fn().mockReturnValue(of({ ...sampleRules[0], id: 2 })),
      updateRule: jest.fn().mockReturnValue(of({ ...sampleRules[0], enabled: false })),
      deleteRule: jest.fn().mockReturnValue(of(undefined)),
      getEvents: jest.fn().mockReturnValue(of({ events: sampleEvents, total: 1 })),
      acknowledgeEvent: jest.fn().mockReturnValue(of({ ...sampleEvents[0], acknowledged_by: 'admin' })),
      createSilence: jest.fn().mockReturnValue(of({ id: 5 })),
      getActiveCount: jest.fn().mockReturnValue(of({ active_count: 1 })),
    };

    TestBed.configureTestingModule({
      providers: [
        AlertsStore,
        { provide: AlertsService, useValue: mockAlertsService },
      ],
    });

    store = TestBed.inject(AlertsStore);
  });

  it('should initialize and load rules and events', () => {
    store.init();
    expect(mockAlertsService.getRules).toHaveBeenCalled();
    expect(mockAlertsService.getEvents).toHaveBeenCalled();
    expect(mockAlertsService.getActiveCount).toHaveBeenCalled();
    expect(store.rules().length).toBe(1);
    expect(store.events().length).toBe(1);
    expect(store.activeCount()).toBe(1);
  });

  it('should toggle rule enabled state', () => {
    store.rules.set([...sampleRules]);
    store.toggleRule(sampleRules[0]);
    expect(mockAlertsService.updateRule).toHaveBeenCalledWith(1, { enabled: false });
    expect(store.rules()[0].enabled).toBe(false);
  });

  it('should delete rule', () => {
    store.rules.set([...sampleRules]);
    store.rulesTotal.set(1);
    store.deleteRule(1);
    expect(mockAlertsService.deleteRule).toHaveBeenCalledWith(1);
    expect(store.rules().length).toBe(0);
    expect(store.rulesTotal()).toBe(0);
  });

  it('should acknowledge event and refresh count', () => {
    store.events.set([...sampleEvents]);
    store.acknowledgeEvent(10);
    expect(mockAlertsService.acknowledgeEvent).toHaveBeenCalledWith(10);
    expect(store.events()[0].acknowledged_by).toBe('admin');
  });

  it('should set filters and reload events', () => {
    store.setStatusFilter('firing');
    expect(store.eventsStatusFilter()).toBe('firing');
    expect(mockAlertsService.getEvents).toHaveBeenCalledWith('firing', undefined);
  });
});
