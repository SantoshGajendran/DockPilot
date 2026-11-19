import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Subject, EMPTY } from 'rxjs';
import { DashboardStore } from './dashboard.store';
import { OverviewService } from '../../core/services/overview.service';
import { OverviewResponse } from '../../core/models/overview.model';

describe('DashboardStore', () => {
  let store: DashboardStore;
  let overviewServiceSpy: jest.Mocked<OverviewService>;

  const mockData: OverviewResponse = {
    host: {
      cpu_percent: 25.0,
      memory_percent: 60.0,
      memory_used_bytes: 6000000000,
      memory_total_bytes: 10000000000,
      disk_percent: 75.0,
      disk_used_bytes: 75000000000,
      disk_total_bytes: 100000000000,
      load_avg: [1.2, 0.9, 0.8],
      uptime_seconds: 3600
    },
    containers: {
      total: 3,
      running: 2,
      exited: 1,
      restarting: 0,
      unhealthy: 0,
      paused: 0
    },
    top_cpu: [
      { id: '1', name: 'app-web', image: 'node:18', cpu_percent: 15.0, memory_bytes: 200000000, memory_percent: 2.0, status: 'running' }
    ],
    top_memory: [
      { id: '2', name: 'app-db', image: 'postgres:16', cpu_percent: 5.0, memory_bytes: 500000000, memory_percent: 5.0, status: 'running' }
    ],
    recent_events: [],
    active_alerts_count: 1,
    docker_connected: true,
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    overviewServiceSpy = {
      getOverview: jest.fn().mockReturnValue(of(mockData)),
      getOverviewStream: jest.fn().mockReturnValue(of(mockData))
    } as unknown as jest.Mocked<OverviewService>;

    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        { provide: OverviewService, useValue: overviewServiceSpy }
      ]
    });

    store = TestBed.inject(DashboardStore);
  });

  afterEach(() => {
    store.destroy();
  });

  it('should initialize and load data from stream', () => {
    store.init();
    expect(store.isLoading()).toBe(false);
    expect(store.data()?.host.cpu_percent).toBe(25.0);
    expect(store.hasContainers()).toBe(true);
    expect(store.isStale()).toBe(false);
  });

  it('should build donut chart dataset for container states', () => {
    store.init();
    const chart = store.containerStateChartData();
    expect(chart.labels).toContain('Running');
    expect(chart.labels).toContain('Exited');
    expect(chart.datasets[0].data).toEqual([2, 1, 0, 0, 0]);
  });

  it('should build horizontal bar chart datasets for top CPU and top Memory', () => {
    store.init();
    const cpuChart = store.topCpuChartData();
    expect(cpuChart.labels).toEqual(['app-web']);
    expect(cpuChart.datasets[0].data).toEqual([15.0]);

    const memChart = store.topMemoryChartData();
    expect(memChart.labels).toEqual(['app-db']);
    expect(memChart.datasets[0].data).toEqual([5.0]);
  });

  it('should flag data as stale when watchdog timer detects missed heartbeats', fakeAsync(() => {
    store.init();
    expect(store.isStale()).toBe(false);

    // Advance time past stale threshold (default 6 seconds)
    tick(7000);
    expect(store.isStale()).toBe(true);
  }));

  it('should recover from stale state when a new update arrives on stream', fakeAsync(() => {
    const streamSubject = new Subject<OverviewResponse>();
    overviewServiceSpy.getOverviewStream.mockReturnValue(streamSubject.asObservable());

    store.init();
    expect(store.isStale()).toBe(false);

    // Advance time past stale threshold
    tick(7000);
    expect(store.isStale()).toBe(true);

    // Push new update from stream
    streamSubject.next({
      ...mockData,
      host: { ...mockData.host, cpu_percent: 30.0 }
    });

    expect(store.isStale()).toBe(false);
    expect(store.data()?.host.cpu_percent).toBe(30.0);
  }));

  it('should report hasContainers as false when total container count is 0', () => {
    const emptyData: OverviewResponse = {
      ...mockData,
      containers: { total: 0, running: 0, exited: 0, restarting: 0, unhealthy: 0, paused: 0 },
      top_cpu: [],
      top_memory: []
    };
    overviewServiceSpy.getOverview.mockReturnValue(of(emptyData));
    overviewServiceSpy.getOverviewStream.mockReturnValue(of(emptyData));

    store.init();
    expect(store.hasContainers()).toBe(false);
    expect(store.containerStateChartData().datasets[0].data).toEqual([0, 0, 0, 0, 0]);
    expect(store.topCpuChartData().labels).toEqual([]);
    expect(store.topMemoryChartData().labels).toEqual([]);
  });

  it('should handle snapshot fetch error and set error signal', () => {
    overviewServiceSpy.getOverview.mockReturnValue(throwError(() => new Error('Snapshot failure')));
    overviewServiceSpy.getOverviewStream.mockReturnValue(EMPTY);

    store.init();
    expect(store.error()).toBe('Snapshot failure');
    expect(store.isLoading()).toBe(false);
  });

  it('should handle stream error and set error signal', () => {
    overviewServiceSpy.getOverview.mockReturnValue(EMPTY);
    overviewServiceSpy.getOverviewStream.mockReturnValue(throwError(() => new Error('Stream failed')));

    store.init();
    expect(store.error()).toBe('Stream failed');
  });
});
