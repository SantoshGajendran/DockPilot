import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OverviewService } from './overview.service';
import { SseService } from './sse.service';
import { of } from 'rxjs';
import { OverviewResponse } from '../models/overview.model';

describe('OverviewService', () => {
  let service: OverviewService;
  let httpMock: HttpTestingController;
  let sseServiceSpy: jest.Mocked<SseService>;

  const mockOverview: OverviewResponse = {
    host: {
      cpu_percent: 10.5,
      memory_percent: 50.0,
      memory_used_bytes: 8589934592,
      memory_total_bytes: 17179869184,
      disk_percent: 40.0,
      disk_used_bytes: 42949672960,
      disk_total_bytes: 107374182400,
      load_avg: [0.5, 0.7, 0.6],
      uptime_seconds: 12000
    },
    containers: {
      total: 2,
      running: 2,
      exited: 0,
      restarting: 0,
      unhealthy: 0,
      paused: 0
    },
    top_cpu: [],
    top_memory: [],
    recent_events: [],
    active_alerts_count: 0,
    docker_connected: true,
    timestamp: '2026-11-19T10:00:00Z'
  };

  beforeEach(() => {
    sseServiceSpy = {
      connect: jest.fn().mockReturnValue(of(mockOverview)),
      disconnect: jest.fn()
    } as unknown as jest.Mocked<SseService>;

    TestBed.configureTestingModule({
      providers: [
        OverviewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SseService, useValue: sseServiceSpy }
      ]
    });

    service = TestBed.inject(OverviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch overview snapshot via HTTP GET', () => {
    service.getOverview().subscribe(res => {
      expect(res.host.cpu_percent).toBe(10.5);
      expect(res.containers.running).toBe(2);
    });

    const req = httpMock.expectOne('/api/v1/overview');
    expect(req.request.method).toBe('GET');
    req.flush(mockOverview);
  });

  it('should receive overview stream from SseService', (done) => {
    service.getOverviewStream().subscribe(res => {
      expect(res.docker_connected).toBe(true);
      expect(sseServiceSpy.connect).toHaveBeenCalledWith('/api/v1/overview/stream');
      done();
    });
  });
});
