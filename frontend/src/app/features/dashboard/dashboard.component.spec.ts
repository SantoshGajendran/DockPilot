import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal, WritableSignal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardStore } from './dashboard.store';
import { OverviewResponse } from '../../core/models/overview.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let storeMock: {
    data: WritableSignal<OverviewResponse | null>;
    isLoading: WritableSignal<boolean>;
    isStale: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    hasContainers: WritableSignal<boolean>;
    containerStateChartData: WritableSignal<any>;
    topCpuChartData: WritableSignal<any>;
    topMemoryChartData: WritableSignal<any>;
    init: jest.Mock;
    destroy: jest.Mock;
  };

  const mockOverview: OverviewResponse = {
    host: {
      cpu_percent: 20.0,
      memory_percent: 40.0,
      memory_used_bytes: 4000000000,
      memory_total_bytes: 10000000000,
      disk_percent: 50.0,
      disk_used_bytes: 50000000000,
      disk_total_bytes: 100000000000,
      load_avg: [0.5, 0.4, 0.3],
      uptime_seconds: 7200
    },
    containers: { total: 2, running: 2, exited: 0, restarting: 0, unhealthy: 0, paused: 0 },
    top_cpu: [
      { id: 'c1', name: 'web-app', image: 'nginx:alpine', cpu_percent: 15.5, memory_bytes: 120000000, memory_percent: 1.2, status: 'running' }
    ],
    top_memory: [
      { id: 'c2', name: 'db-app', image: 'postgres:16', cpu_percent: 4.5, memory_bytes: 450000000, memory_percent: 4.5, status: 'running' }
    ],
    recent_events: [
      { id: 'e1', action: 'start', actor_type: 'container', actor_name: 'web-app', timestamp: '2026-11-19T10:00:00Z' }
    ],
    active_alerts_count: 0,
    docker_connected: true,
    timestamp: '2026-11-19T10:00:00Z'
  };

  beforeEach(async () => {
    storeMock = {
      data: signal(mockOverview),
      isLoading: signal(false),
      isStale: signal(false),
      error: signal(null),
      hasContainers: signal(true),
      containerStateChartData: signal({ labels: ['Running'], datasets: [{ data: [2] }] }),
      topCpuChartData: signal({ labels: ['web-app'], datasets: [{ data: [15.5] }] }),
      topMemoryChartData: signal({ labels: ['db-app'], datasets: [{ data: [4.5] }] }),
      init: jest.fn(),
      destroy: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: DashboardStore, useValue: storeMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize store on init and destroy on destroy', () => {
    expect(storeMock.init).toHaveBeenCalled();
    fixture.destroy();
    expect(storeMock.destroy).toHaveBeenCalled();
  });

  it('should render host gauge cards with metrics', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('20.0%');
    expect(el.textContent).toContain('40.0%');
  });

  it('should show stale warning banner when store isStale is true', () => {
    storeMock.isStale.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Live updates paused');
  });

  it('should show empty container message when hasContainers is false', () => {
    storeMock.hasContainers.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No containers running');
  });

  it('should render active alerts banner when active_alerts_count is greater than 0', () => {
    storeMock.data.set({
      ...mockOverview,
      active_alerts_count: 3
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('3 active alerts');
  });

  it('should format bytes correctly', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1.00 KiB');
    expect(component.formatBytes(1048576)).toBe('1.00 MiB');
    expect(component.formatBytes(1073741824)).toBe('1.00 GiB');
  });

  it('should format uptime seconds correctly', () => {
    expect(component.formatUptime(0)).toBe('0m');
    expect(component.formatUptime(120)).toBe('2m');
    expect(component.formatUptime(3660)).toBe('1h 1m');
    expect(component.formatUptime(90060)).toBe('1d 1h 1m');
  });
});
