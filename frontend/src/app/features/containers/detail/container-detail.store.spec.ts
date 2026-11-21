import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ContainerDetailStore } from './container-detail.store';
import { ContainersDetailService } from '../../../core/services/container-detail.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  ContainerDetail,
  ContainerLiveStats,
  ContainerMetricsHistoryResponse,
  EnvRevealResponse,
} from '../../../core/models/container-detail.model';

describe('ContainerDetailStore', () => {
  let store: ContainerDetailStore;
  let serviceMock: Partial<ContainersDetailService>;
  let toastMock: Partial<ToastService>;

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
    mounts: [],
    networks: [],
    labels: {},
    env: [{ key: 'REDIS_PASSWORD', value: '********', is_masked: true }],
    limits: { memory: 536870912 },
    healthcheck: null,
  };

  const mockStats: ContainerLiveStats = {
    container_id: 'c1',
    timestamp: '2026-11-21T10:00:00Z',
    cpu_percent: 3.5,
    memory_bytes: 67108864,
    memory_limit: 536870912,
    memory_percent: 12.5,
    net_rx_bytes: 1024,
    net_tx_bytes: 2048,
    block_read_bytes: 4096,
    block_write_bytes: 8192,
  };

  const mockHistory: ContainerMetricsHistoryResponse = {
    container_id: 'c1',
    range: '1h',
    points: [mockStats],
  };

  beforeEach(() => {
    serviceMock = {
      getContainerDetail: jest.fn().mockReturnValue(of(mockDetail)),
      getStatsStream: jest.fn().mockReturnValue(of(mockStats)),
      getMetricsHistory: jest.fn().mockReturnValue(of(mockHistory)),
      revealEnv: jest.fn().mockReturnValue(
        of({ env: [{ key: 'REDIS_PASSWORD', value: 'secret123', is_masked: false }] } as EnvRevealResponse)
      ),
      executeAction: jest.fn().mockReturnValue(of({ message: 'Action restart executed' })),
    };

    toastMock = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ContainerDetailStore,
        { provide: ContainersDetailService, useValue: serviceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    store = TestBed.inject(ContainerDetailStore);
  });

  afterEach(() => {
    store.destroy();
  });

  it('should initialize with default signals', () => {
    expect(store.containerId()).toBeNull();
    expect(store.detail()).toBeNull();
    expect(store.activeTab()).toBe('overview');
    expect(store.metricsRange()).toBe('1h');
    expect(store.envRevealed()).toBe(false);
  });

  it('should load container details, live stats, and metrics history', () => {
    store.loadContainer('c1');

    expect(store.containerId()).toBe('c1');
    expect(store.loading()).toBe(false);
    expect(store.detail()).toEqual(mockDetail);
    expect(store.state()).toBe('running');
    expect(store.health()).toBe('healthy');
    expect(store.cpuPercent()).toBe(3.5);
    expect(store.memoryPercent()).toBe(12.5);
    expect(store.metricsHistory().length).toBe(1);
  });

  it('should handle container detail load error', () => {
    (serviceMock.getContainerDetail as jest.Mock).mockReturnValue(
      throwError(() => ({ error: { detail: 'Container not found' } }))
    );

    store.loadContainer('invalid-id');
    expect(store.error()).toBe('Container not found');
    expect(store.loading()).toBe(false);
  });

  it('should change active tab', () => {
    store.setTab('metrics');
    expect(store.activeTab()).toBe('metrics');
  });

  it('should change metrics range and reload metrics history', () => {
    store.loadContainer('c1');
    store.setMetricsRange('24h');

    expect(store.metricsRange()).toBe('24h');
    expect(serviceMock.getMetricsHistory).toHaveBeenCalledWith('c1', '24h');
  });

  it('should reveal secrets and update env in detail signal', () => {
    store.loadContainer('c1');
    store.revealSecrets();

    expect(serviceMock.revealEnv).toHaveBeenCalledWith('c1');
    expect(store.envRevealed()).toBe(true);
    expect(store.detail()?.env[0].value).toBe('secret123');
    expect(toastMock.success).toHaveBeenCalledWith('Environment variables revealed');
  });

  it('should execute lifecycle action and refresh detail', () => {
    store.loadContainer('c1');
    store.executeAction('restart');

    expect(serviceMock.executeAction).toHaveBeenCalledWith('c1', 'restart');
    expect(toastMock.success).toHaveBeenCalledWith('Action restart executed');
    expect(serviceMock.getContainerDetail).toHaveBeenCalledTimes(2);
  });
});
