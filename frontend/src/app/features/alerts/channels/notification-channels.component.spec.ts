import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { NotificationChannelsComponent } from './notification-channels.component';
import { NotificationsStore } from '../notifications.store';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationChannel, NotificationRoute } from '../../../core/models/notifications.model';

describe('NotificationChannelsComponent', () => {
  let component: NotificationChannelsComponent;
  let fixture: ComponentFixture<NotificationChannelsComponent>;
  let mockStore: any;
  let mockAuthService: any;
  let mockDialog: any;
  let mockSnackBar: any;

  const mockChannel: NotificationChannel = {
    id: 1,
    name: 'Slack Alerts',
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
    channel_name: 'Slack Alerts',
    name: 'All Warnings',
    min_severity: 'warning',
    scope_type: 'all',
    enabled: true,
    created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockStore = {
      channels: jest.fn().mockReturnValue([mockChannel]),
      channelsLoading: jest.fn().mockReturnValue(false),
      channelsError: jest.fn().mockReturnValue(null),
      routes: jest.fn().mockReturnValue([mockRoute]),
      routesLoading: jest.fn().mockReturnValue(false),
      routesError: jest.fn().mockReturnValue(null),
      logs: jest.fn().mockReturnValue([]),
      logsTotal: jest.fn().mockReturnValue(0),
      logsLoading: jest.fn().mockReturnValue(false),
      logsError: jest.fn().mockReturnValue(null),
      selectedStatusFilter: jest.fn().mockReturnValue(null),
      testResults: jest.fn().mockReturnValue({}),
      testingChannelId: jest.fn().mockReturnValue(null),
      init: jest.fn(),
      loadChannels: jest.fn(),
      loadRoutes: jest.fn(),
      loadLogs: jest.fn(),
      createChannel: jest.fn(),
      updateChannel: jest.fn(),
      deleteChannel: jest.fn(),
      testChannel: jest.fn(),
      createRoute: jest.fn(),
      updateRoute: jest.fn(),
      deleteRoute: jest.fn(),
      setStatusFilter: jest.fn(),
    };

    mockAuthService = {
      hasRole: jest.fn().mockReturnValue(true),
    };

    mockDialog = {
      open: jest.fn().mockReturnValue({
        afterClosed: () => of({ name: 'New Channel' }),
      }),
    };

    mockSnackBar = {
      open: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationChannelsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    })
      .overrideComponent(NotificationChannelsComponent, {
        set: {
          providers: [
            { provide: NotificationsStore, useValue: mockStore },
            { provide: MatDialog, useValue: mockDialog },
            { provide: MatSnackBar, useValue: mockSnackBar },
            { provide: AuthService, useValue: mockAuthService },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NotificationChannelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize store', () => {
    expect(component).toBeTruthy();
    expect(mockStore.init).toHaveBeenCalled();
  });

  it('should open add channel dialog and save', () => {
    component.openAddChannelDialog();
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockStore.createChannel).toHaveBeenCalledWith({ name: 'New Channel' }, expect.any(Function));
  });

  it('should open add route dialog and save', () => {
    component.openAddRouteDialog();
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockStore.createRoute).toHaveBeenCalledWith({ name: 'New Channel' }, expect.any(Function));
  });

  it('should toggle channel enabled state', () => {
    component.toggleChannel(mockChannel);
    expect(mockStore.updateChannel).toHaveBeenCalledWith(1, { enabled: false });
  });
});
