import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HostStore } from './host.store';
import { HostService } from '../../core/services/host.service';
import { DockerDiskUsage, HostHistoryResponse, HostInfo, HostLiveMetrics } from '../../core/models/host.model';

describe('HostStore', () => {
  let store: HostStore;
  let hostServiceMock: {
    getHostInfo: jest.Mock;
    getLiveMetrics: jest.Mock;
    getMetricsHistory: jest.Mock;
    getDockerDiskUsage: jest.Mock;
  };

  const mockInfo: HostInfo = {
    hostname: 'test-host',
    os_name: 'Linux',
    os_version: '24.04',
    kernel_version: '6.8.0',
    cpu_model: 'AMD',
    cpu_cores_physical: 4,
    cpu_cores_logical: 8,
    total_memory_bytes: 16000000000,
    docker_version: '27.3.1',
    docker_storage_driver: 'overlay2',
  };

  const mockLive: HostLiveMetrics = {
    timestamp: '2026-11-21T10:00:00Z',
    cpu: { overall_percent: 45.0, cores_percent: [40.0, 50.0] },
    memory: {
      total_bytes: 16000000000,
      used_bytes: 8000000000,
      available_bytes: 8000000000,
      percent: 50.0,
      swap_total_bytes: 4000000000,
      swap_used_bytes: 1000000000,
      swap_percent: 25.0,
    },
    mounts: [
      {
        mountpoint: '/',
        device: '/dev/sda1',
        fstype: 'ext4',
        total_bytes: 1000,
        used_bytes: 850,
        free_bytes: 150,
        percent: 85.0, // warning
        inodes_total: 100,
        inodes_used: 95,
        inodes_free: 5,
        inodes_percent: 95.0, // critical
      },
    ],
    disk_io: { read_bytes_sec: 100, write_bytes_sec: 200, read_count_sec: 1, write_count_sec: 2 },
    network: [],
    load_1m: 0.5,
    load_5m: 0.6,
    load_15m: 0.7,
    temperatures: [],
    top_processes: [
      { pid: 1, name: 'nginx', username: 'www-data', cpu_percent: 10.0, memory_percent: 5.0, memory_rss_bytes: 1000, status: 'sleeping' },
      { pid: 2, name: 'postgres', username: 'postgres', cpu_percent: 25.0, memory_percent: 15.0, memory_rss_bytes: 5000, status: 'running' },
    ],
  };

  const mockHistory: HostHistoryResponse = {
    range: '1h',
    points: [{ timestamp: '2026-11-21T10:00:00Z', cpu_percent: 45.0, memory_bytes: 8000000000, swap_bytes: 1000000000, disk_read_bytes: 100, disk_write_bytes: 200, network_rx_bytes: 300, network_tx_bytes: 400, load_1m: 0.5 }],
  };

  const mockDocker: DockerDiskUsage = {
    images: { count: 5, total_bytes: 500, reclaimable_bytes: 100, reclaimable_percent: 20 },
    containers: { count: 2, total_bytes: 200, reclaimable_bytes: 50, reclaimable_percent: 25 },
    volumes: { count: 3, total_bytes: 300, reclaimable_bytes: 0, reclaimable_percent: 0 },
    build_cache: { count: 1, total_bytes: 100, reclaimable_bytes: 10, reclaimable_percent: 10 },
  };

  beforeEach(() => {
    hostServiceMock = {
      getHostInfo: jest.fn().mockReturnValue(of(mockInfo)),
      getLiveMetrics: jest.fn().mockReturnValue(of(mockLive)),
      getMetricsHistory: jest.fn().mockReturnValue(of(mockHistory)),
      getDockerDiskUsage: jest.fn().mockReturnValue(of(mockDocker)),
    };

    TestBed.configureTestingModule({
      providers: [
        HostStore,
        { provide: HostService, useValue: hostServiceMock },
      ],
    });

    store = TestBed.inject(HostStore);
  });

  afterEach(() => {
    store.destroy();
  });

  it('should load all data successfully', () => {
    store.loadAll();
    expect(store.isLoading()).toBe(false);
    expect(store.hostInfo()?.hostname).toBe('test-host');
    expect(store.liveMetrics()?.cpu.overall_percent).toBe(45.0);
    expect(store.historyPoints().length).toBe(1);
    expect(store.dockerUsage()?.images.count).toBe(5);

    // Computed checks
    expect(store.cpuCores().length).toBe(2);
    expect(store.mounts()[0].isDiskWarning).toBe(true);
    expect(store.mounts()[0].isInodeCritical).toBe(true);
  });

  it('should sort processes by cpu and memory', () => {
    store.loadAll();
    // Default cpu sort
    expect(store.sortedProcesses()[0].name).toBe('postgres');

    store.setProcessSort('memory');
    expect(store.sortedProcesses()[0].name).toBe('postgres');
  });

  it('should handle load error', () => {
    hostServiceMock.getHostInfo.mockReturnValue(throwError(() => new Error('Network error')));
    store.loadAll();
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toContain('Network error');
  });

  it('should change range and load history', () => {
    store.setRange('6h');
    expect(store.selectedRange()).toBe('6h');
    expect(hostServiceMock.getMetricsHistory).toHaveBeenCalledWith('6h');
  });
});
