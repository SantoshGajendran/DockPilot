import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { ContainerDetailComponent } from './container-detail.component';
import { ContainerDetailStore } from './container-detail.store';
import { AuthService } from '../../../core/services/auth.service';
import { EventsService } from '../../../core/services/events.service';
import { TerminalService } from '../../../core/services/terminal.service';
import { ContainerDetail } from '../../../core/models/container-detail.model';

describe('ContainerDetailComponent', () => {
  let component: ContainerDetailComponent;
  let fixture: ComponentFixture<ContainerDetailComponent>;
  let mockStore: any;
  let mockAuthService: any;
  let mockRouter: any;
  let mockDialog: any;

  const mockDetail: ContainerDetail = {
    id: 'c1',
    name: 'dockpilot-redis',
    image: 'redis:7-alpine',
    command: 'redis-server',
    created: '2026-11-21T10:00:00Z',
    state: 'running',
    status: 'Up 2 hours',
    health: 'healthy',
    restart_count: 0,
    restart_policy: { Name: 'unless-stopped' },
    ports: {},
    mounts: [
      {
        type: 'volume',
        source: 'redis-data',
        destination: '/data',
        mode: 'rw',
        rw: true,
      },
    ],
    networks: [
      {
        network_name: 'bridge',
        ip_address: '172.17.0.2',
        gateway: '172.17.0.1',
        mac_address: '02:42:ac:11:00:02',
      },
    ],
    labels: { tier: 'cache' },
    env: [{ key: 'REDIS_PASSWORD', value: '********', is_masked: true }],
    limits: { memory: 536870912 },
    healthcheck: { status: 'healthy', failing_streak: 0, log: [] },
  };

  beforeEach(async () => {
    mockStore = {
      containerId: signal('c1'),
      detail: signal<ContainerDetail | null>(mockDetail),
      loading: signal(false),
      error: signal<string | null>(null),
      activeTab: signal('overview'),
      metricsRange: signal('1h'),
      cpuPercent: signal(2.5),
      memoryBytes: signal(67108864),
      memoryLimit: signal(536870912),
      memoryPercent: signal(12.5),
      netRxBytes: signal(1024),
      netTxBytes: signal(2048),
      blockReadBytes: signal(4096),
      blockWriteBytes: signal(8192),
      metricsHistory: signal([]),
      envRevealed: signal(false),
      loadContainer: jest.fn(),
      setTab: jest.fn(),
      setMetricsRange: jest.fn(),
      revealSecrets: jest.fn(),
      executeAction: jest.fn(),
      destroy: jest.fn(),
    };

    mockAuthService = {
      hasRole: jest.fn().mockReturnValue(true),
    };

    mockRouter = {
      navigate: jest.fn(),
    };

    mockDialog = {
      open: jest.fn().mockReturnValue({
        afterClosed: () => of(true),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ContainerDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MatDialog, useValue: mockDialog },
        {
          provide: EventsService,
          useValue: { getEvents: jest.fn().mockReturnValue(of({ items: [], total: 0 })) },
        },
        {
          provide: TerminalService,
          useValue: {
            getStatus: jest.fn().mockReturnValue(of({ enabled: true, allowed_shells: ['/bin/sh'] })),
            createWebSocket: jest.fn().mockReturnValue({ close: jest.fn() }),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'c1' } },
            queryParams: of({ tab: 'overview' }),
          },
        },
      ],
    })
      .overrideComponent(ContainerDetailComponent, {
        set: {
          providers: [
            { provide: ContainerDetailStore, useValue: mockStore },
            { provide: MatDialog, useValue: mockDialog },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ContainerDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load container on init', () => {
    expect(component).toBeTruthy();
    expect(mockStore.loadContainer).toHaveBeenCalledWith('c1');
  });

  it('should render container header info', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('dockpilot-redis');
    expect(el.querySelector('.image-tag')?.textContent).toContain('redis:7-alpine');
  });

  it('should synchronize tab change with router query param', () => {
    component.onTabChange(1); // metrics
    expect(mockStore.setTab).toHaveBeenCalledWith('metrics');
    expect(mockRouter.navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { tab: 'metrics' },
      queryParamsHandling: 'merge',
    });
  });

  it('should trigger action confirmation dialog', () => {
    component.confirmAction('restart');
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockStore.executeAction).toHaveBeenCalledWith('restart');
  });

  it('should format bytes helper correctly', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
    expect(component.formatBytes(1073741824)).toBe('1 GB');
  });

  it('should include terminal tab in availableTabs for admin', () => {
    expect(component.availableTabs()).toContain('terminal');
  });

  it('should exclude terminal tab in availableTabs for non-admin', () => {
    mockAuthService.hasRole.mockReturnValue(false);
    const nonAdminFixture = TestBed.createComponent(ContainerDetailComponent);
    const nonAdminComp = nonAdminFixture.componentInstance;
    expect(nonAdminComp.availableTabs()).not.toContain('terminal');
  });
});
