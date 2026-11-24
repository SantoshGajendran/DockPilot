import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { HostComponent } from './host.component';
import { HostService } from '../../core/services/host.service';
import { DockerDiskUsage, HostHistoryResponse, HostInfo, HostLiveMetrics } from '../../core/models/host.model';

describe('HostComponent', () => {
  let component: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let hostServiceMock: {
    getHostInfo: jest.Mock;
    getLiveMetrics: jest.Mock;
    getMetricsHistory: jest.Mock;
    getDockerDiskUsage: jest.Mock;
  };

  const mockInfo: HostInfo = {
    hostname: 'dockpilot-ubuntu',
    os_name: 'Linux',
    os_version: '24.04',
    kernel_version: '6.8.0-45-generic',
    cpu_model: 'Intel Xeon E5',
    cpu_cores_physical: 4,
    cpu_cores_logical: 8,
    total_memory_bytes: 32000000000,
    docker_version: '27.3.1',
    docker_storage_driver: 'overlay2',
  };

  const mockLive: HostLiveMetrics = {
    timestamp: '2026-11-21T10:00:00Z',
    cpu: { overall_percent: 55.0, cores_percent: [40.0, 70.0, 85.0, 95.0] },
    memory: {
      total_bytes: 32000000000,
      used_bytes: 16000000000,
      available_bytes: 16000000000,
      percent: 50.0,
      swap_total_bytes: 8000000000,
      swap_used_bytes: 2000000000,
      swap_percent: 25.0,
    },
    mounts: [
      {
        mountpoint: '/',
        device: '/dev/sda1',
        fstype: 'ext4',
        total_bytes: 100000000000,
        used_bytes: 85000000000,
        free_bytes: 15000000000,
        percent: 85.0,
        inodes_total: 1000000,
        inodes_used: 950000,
        inodes_free: 50000,
        inodes_percent: 95.0,
      },
    ],
    disk_io: { read_bytes_sec: 1024, write_bytes_sec: 2048, read_count_sec: 10, write_count_sec: 20 },
    network: [
      {
        interface_name: 'eth0',
        rx_bytes_sec: 5000,
        tx_bytes_sec: 3000,
        rx_packets_sec: 50,
        tx_packets_sec: 30,
        rx_errors: 0,
        tx_errors: 0,
      },
    ],
    load_1m: 1.25,
    load_5m: 1.10,
    load_15m: 0.95,
    temperatures: [
      { sensor_name: 'coretemp', label: 'Package id 0', current_celsius: 48.0, high_celsius: 80.0, critical_celsius: 100.0 },
    ],
    top_processes: [
      { pid: 101, name: 'dockerd', username: 'root', cpu_percent: 18.5, memory_percent: 4.2, memory_rss_bytes: 50000000, status: 'running' },
    ],
  };

  const mockHistory: HostHistoryResponse = {
    range: '1h',
    points: [
      {
        timestamp: '2026-11-21T09:30:00Z',
        cpu_percent: 30.0,
        memory_bytes: 14000000000,
        swap_bytes: 1000000000,
        disk_read_bytes: 500,
        disk_write_bytes: 1000,
        network_rx_bytes: 2000,
        network_tx_bytes: 1500,
        load_1m: 0.8,
      },
    ],
  };

  const mockDocker: DockerDiskUsage = {
    images: { count: 12, total_bytes: 4000000000, reclaimable_bytes: 1000000000, reclaimable_percent: 25.0 },
    containers: { count: 8, total_bytes: 200000000, reclaimable_bytes: 50000000, reclaimable_percent: 25.0 },
    volumes: { count: 5, total_bytes: 1500000000, reclaimable_bytes: 300000000, reclaimable_percent: 20.0 },
    build_cache: { count: 20, total_bytes: 3000000000, reclaimable_bytes: 2000000000, reclaimable_percent: 66.7 },
  };

  beforeEach(async () => {
    hostServiceMock = {
      getHostInfo: jest.fn().mockReturnValue(of(mockInfo)),
      getLiveMetrics: jest.fn().mockReturnValue(of(mockLive)),
      getMetricsHistory: jest.fn().mockReturnValue(of(mockHistory)),
      getDockerDiskUsage: jest.fn().mockReturnValue(of(mockDocker)),
    };

    await TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
      providers: [
        { provide: HostService, useValue: hostServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render host info header', () => {
    expect(component).toBeTruthy();
    expect(component.store.hostInfo()?.hostname).toBe('dockpilot-ubuntu');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('dockpilot-ubuntu');
  });

  it('should render cpu cores grid and color classes', () => {
    expect(component.store.cpuCores().length).toBe(4);
    expect(component.getCoreColorClass(40.0)).toBe('normal');
    expect(component.getCoreColorClass(85.0)).toBe('warning');
    expect(component.getCoreColorClass(95.0)).toBe('critical');
  });

  it('should format bytes helper correctly', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1024 * 1024)).toBe('1 MB');
    expect(component.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should switch history range', () => {
    component.onRangeChange('24h');
    expect(component.store.selectedRange()).toBe('24h');
    expect(hostServiceMock.getMetricsHistory).toHaveBeenCalledWith('24h');
  });

  it('should switch process sorting', () => {
    component.onSortChange('memory');
    expect(component.store.processSortField()).toBe('memory');
  });

  it('should have aria-label attributes on progressbar elements', () => {
    const progressBars = fixture.nativeElement.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
    progressBars.forEach((bar: HTMLElement) => {
      expect(bar.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
