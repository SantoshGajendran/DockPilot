import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HostService } from './host.service';
import { HOST_ENDPOINTS } from '../constants/host.constants';
import { DockerDiskUsage, HostHistoryResponse, HostInfo, HostLiveMetrics } from '../models/host.model';

describe('HostService', () => {
  let service: HostService;
  let httpMock: HttpTestingController;

  const mockInfo: HostInfo = {
    hostname: 'ubuntu-dockpilot',
    os_name: 'Linux',
    os_version: '24.04',
    kernel_version: '6.8.0',
    cpu_model: 'AMD EPYC',
    cpu_cores_physical: 4,
    cpu_cores_logical: 8,
    total_memory_bytes: 16000000000,
    docker_version: '27.3.1',
    docker_storage_driver: 'overlay2',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HostService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(HostService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch host info', () => {
    service.getHostInfo().subscribe((info) => {
      expect(info.hostname).toBe('ubuntu-dockpilot');
      expect(info.docker_version).toBe('27.3.1');
    });

    const req = httpMock.expectOne(HOST_ENDPOINTS.info);
    expect(req.request.method).toBe('GET');
    req.flush(mockInfo);
  });

  it('should fetch live metrics', () => {
    const mockLive = {
      timestamp: '2026-11-21T10:00:00Z',
      cpu: { overall_percent: 25.0, cores_percent: [20.0, 30.0] },
      memory: {
        total_bytes: 16000000000,
        used_bytes: 8000000000,
        available_bytes: 8000000000,
        percent: 50.0,
        swap_total_bytes: 4000000000,
        swap_used_bytes: 1000000000,
        swap_percent: 25.0,
      },
      mounts: [],
      disk_io: { read_bytes_sec: 0, write_bytes_sec: 0, read_count_sec: 0, write_count_sec: 0 },
      network: [],
      load_1m: 0.5,
      load_5m: 0.6,
      load_15m: 0.7,
      temperatures: [],
      top_processes: [],
    } as unknown as HostLiveMetrics;

    service.getLiveMetrics().subscribe((live) => {
      expect(live.cpu.overall_percent).toBe(25.0);
      expect(live.memory.percent).toBe(50.0);
    });

    const req = httpMock.expectOne(HOST_ENDPOINTS.metrics);
    expect(req.request.method).toBe('GET');
    req.flush(mockLive);
  });

  it('should fetch metrics history', () => {
    const mockHistory: HostHistoryResponse = {
      range: '6h',
      points: [
        {
          timestamp: '2026-11-21T04:00:00Z',
          cpu_percent: 15.0,
          memory_bytes: 4000000000,
          swap_bytes: 500000000,
          disk_read_bytes: 1000,
          disk_write_bytes: 2000,
          network_rx_bytes: 3000,
          network_tx_bytes: 4000,
          load_1m: 0.4,
        },
      ],
    };

    service.getMetricsHistory('6h').subscribe((hist) => {
      expect(hist.range).toBe('6h');
      expect(hist.points.length).toBe(1);
    });

    const req = httpMock.expectOne(HOST_ENDPOINTS.history('6h'));
    expect(req.request.method).toBe('GET');
    req.flush(mockHistory);
  });

  it('should fetch docker disk usage', () => {
    const mockUsage: DockerDiskUsage = {
      images: { count: 10, total_bytes: 1000, reclaimable_bytes: 200, reclaimable_percent: 20 },
      containers: { count: 5, total_bytes: 500, reclaimable_bytes: 100, reclaimable_percent: 20 },
      volumes: { count: 2, total_bytes: 2000, reclaimable_bytes: 500, reclaimable_percent: 25 },
      build_cache: { count: 1, total_bytes: 100, reclaimable_bytes: 50, reclaimable_percent: 50 },
    };

    service.getDockerDiskUsage().subscribe((usage) => {
      expect(usage.images.count).toBe(10);
      expect(usage.containers.count).toBe(5);
    });

    const req = httpMock.expectOne(HOST_ENDPOINTS.dockerUsage);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsage);
  });
});
