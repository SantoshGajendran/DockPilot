import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContainersDetailService } from './container-detail.service';
import { SseService } from './sse.service';
import { of } from 'rxjs';
import {
  ContainerDetail,
  ContainerLiveStats,
  ContainerMetricsHistoryResponse,
  EnvRevealResponse,
} from '../models/container-detail.model';

describe('ContainersDetailService', () => {
  let service: ContainersDetailService;
  let httpMock: HttpTestingController;
  let sseMock: { connect: jest.Mock };

  beforeEach(() => {
    sseMock = {
      connect: jest.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [
        ContainersDetailService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SseService, useValue: sseMock },
      ],
    });

    service = TestBed.inject(ContainersDetailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get container details via GET', () => {
    const mockDetail: Partial<ContainerDetail> = {
      id: 'c1',
      name: 'dockpilot-redis',
      state: 'running',
    };

    service.getContainerDetail('c1').subscribe((res) => {
      expect(res.id).toBe('c1');
      expect(res.name).toBe('dockpilot-redis');
    });

    const req = httpMock.expectOne('api/v1/containers/c1');
    expect(req.request.method).toBe('GET');
    req.flush(mockDetail);
  });

  it('should reveal secrets via POST', () => {
    const mockReveal: EnvRevealResponse = {
      env: [{ key: 'REDIS_PASSWORD', value: 'secret123', is_masked: false }],
    };

    service.revealEnv('c1').subscribe((res) => {
      expect(res.env[0].value).toBe('secret123');
    });

    const req = httpMock.expectOne('api/v1/containers/c1/env/reveal');
    expect(req.request.method).toBe('POST');
    req.flush(mockReveal);
  });

  it('should get metrics history via GET', () => {
    const mockHistory: ContainerMetricsHistoryResponse = {
      container_id: 'c1',
      range: '6h',
      points: [],
    };

    service.getMetricsHistory('c1', '6h').subscribe((res) => {
      expect(res.range).toBe('6h');
    });

    const req = httpMock.expectOne('api/v1/containers/c1/metrics?range=6h');
    expect(req.request.method).toBe('GET');
    req.flush(mockHistory);
  });

  it('should stream stats via SseService', () => {
    service.getStatsStream('c1').subscribe();
    expect(sseMock.connect).toHaveBeenCalledWith('api/v1/containers/c1/stats');
  });

  it('should execute action via POST', () => {
    service.executeAction('c1', 'start').subscribe((res) => {
      expect(res.message).toBe('ok');
    });

    const req = httpMock.expectOne('api/v1/containers/c1/start');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });
  });
});
