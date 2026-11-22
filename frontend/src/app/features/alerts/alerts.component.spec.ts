import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AlertsComponent } from './alerts.component';
import { AlertsStore } from './alerts.store';
import { AlertsService } from '../../core/services/alerts.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertRule, AlertEvent } from '../../core/models/alerts.model';

describe('AlertsComponent', () => {
  let component: AlertsComponent;
  let fixture: ComponentFixture<AlertsComponent>;
  let mockStore: any;
  let mockAuthService: any;
  let mockDialog: any;
  let mockSnackBar: any;
  let mockAlertsService: any;

  const mockRule: AlertRule = {
    id: 1,
    name: 'Sample Rule',
    rule_type: 'container_down',
    scope_type: 'all',
    severity: 'critical',
    duration_minutes: 0,
    cooldown_minutes: 15,
    enabled: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockEvent: AlertEvent = {
    id: 10,
    rule_id: 1,
    rule_name: 'Sample Rule',
    rule_type: 'container_down',
    severity: 'critical',
    target_type: 'container',
    target_id: 'c1',
    target_name: 'redis',
    status: 'firing',
    message: 'Container exited',
    started_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockStore = {
      rules: jest.fn().mockReturnValue([mockRule]),
      rulesTotal: jest.fn().mockReturnValue(1),
      rulesLoading: jest.fn().mockReturnValue(false),
      rulesError: jest.fn().mockReturnValue(null),
      events: jest.fn().mockReturnValue([mockEvent]),
      eventsTotal: jest.fn().mockReturnValue(1),
      eventsLoading: jest.fn().mockReturnValue(false),
      eventsError: jest.fn().mockReturnValue(null),
      eventsStatusFilter: jest.fn().mockReturnValue(null),
      eventsSeverityFilter: jest.fn().mockReturnValue(null),
      activeCount: jest.fn().mockReturnValue(1),
      init: jest.fn(),
      loadRules: jest.fn(),
      loadEvents: jest.fn(),
      createRule: jest.fn(),
      updateRule: jest.fn(),
      toggleRule: jest.fn(),
      deleteRule: jest.fn(),
      acknowledgeEvent: jest.fn(),
      createSilence: jest.fn(),
      setStatusFilter: jest.fn(),
      setSeverityFilter: jest.fn(),
    };

    mockAuthService = {
      hasRole: jest.fn().mockReturnValue(true),
    };

    mockDialog = {
      open: jest.fn().mockReturnValue({
        afterClosed: () => of({ name: 'New Rule' }),
      }),
    };

    mockSnackBar = {
      open: jest.fn(),
    };

    mockAlertsService = {
      dryRunRuleById: jest.fn().mockReturnValue(of({ matches_count: 1 })),
    };

    await TestBed.configureTestingModule({
      imports: [AlertsComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: AlertsService, useValue: mockAlertsService },
      ],
    })
      .overrideComponent(AlertsComponent, {
        set: {
          providers: [
            { provide: AlertsStore, useValue: mockStore },
            { provide: MatDialog, useValue: mockDialog },
            { provide: MatSnackBar, useValue: mockSnackBar },
            { provide: AlertsService, useValue: mockAlertsService },
            { provide: AuthService, useValue: mockAuthService },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize store', () => {
    expect(component).toBeTruthy();
    expect(mockStore.init).toHaveBeenCalled();
  });

  it('should acknowledge an event', () => {
    component.acknowledgeEvent(mockEvent);
    expect(mockStore.acknowledgeEvent).toHaveBeenCalledWith(10);
    expect(mockSnackBar.open).toHaveBeenCalledWith('Alert acknowledged', 'Close', expect.any(Object));
  });

  it('should open create rule dialog and save', () => {
    component.openCreateRuleDialog();
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockStore.createRule).toHaveBeenCalledWith({ name: 'New Rule' }, expect.any(Function));
  });

  it('should run dry-run test on rule', () => {
    component.testRule(mockRule);
    expect(mockAlertsService.dryRunRuleById).toHaveBeenCalledWith(1);
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      expect.stringContaining('Dry run: Rule conditions matched on 1 target(s)'),
      'Close',
      expect.any(Object)
    );
  });
});
