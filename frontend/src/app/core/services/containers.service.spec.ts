import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ContainersService } from './containers.service';
import { SseService } from './sse.service';
import { of } from 'rxjs';
import {
  ContainersListResponse,
  ContainerLiveMetrics,
  BulkActionResponse,
  DeleteTokenResponse,
} from '../models/container.model';

describe('ContainersService', () => {
  let service: ContainersService;
  let httpMock: HttpTestingController;
  let sseMock: { connect: jest.Mock };

  beforeEach(() => {
    sseMock = {
      connect: jest.fn().mockReturnValue(of([])),
    };

    TestBed.configureTestingModule({
      providers: [
        ContainersService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SseService, useValue: sseMock },
      ],
    });

    service = TestBed.inject(ContainersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch containers list with query parameters', () => {
    const mockResponse: ContainersListResponse = {
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 1,
    };

    service.listContainers({ q: 'redis', state: 'running' }).subscribe((res) => {
      expect(res.total).toBe(0);
    });

    const req = httpMock.expectOne((r) => r.url.includes('api/v1/containers') && r.params.get('q') === 'redis');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call executeAction with POST', () => {
    service.executeAction('c1', 'restart').subscribe((res) => {
      expect(res.message).toBe('ok');
    });

    const req = httpMock.expectOne('api/v1/containers/c1/restart');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'ok' });
  });

  it('should call bulkAction with POST and body', () => {
    const mockBulk: BulkActionResponse = {
      results: [{ container_id: 'c1', action: 'stop', success: true }],
      total_success: 1,
      total_failed: 0,
    };

    service.bulkAction('stop', ['c1']).subscribe((res) => {
      expect(res.total_success).toBe(1);
    });

    const req = httpMock.expectOne('api/v1/containers/bulk');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ action: 'stop', container_ids: ['c1'] });
    req.flush(mockBulk);
  });

  it('should request delete token', () => {
    const mockTokenRes: DeleteTokenResponse = {
      token: 'test.del.token',
      container_id: 'c1',
      expires_at: '2026-11-21T12:00:00Z',
    };

    service.getDeleteToken('c1').subscribe((res) => {
      expect(res.token).toBe('test.del.token');
    });

    const req = httpMock.expectOne('api/v1/containers/c1/delete-token');
    expect(req.request.method).toBe('POST');
    req.flush(mockTokenRes);
  });

  it('should delete container with token parameter', () => {
    service.deleteContainer('c1', 'test.del.token').subscribe((res) => {
      expect(res.message).toBe('deleted');
    });

    const req = httpMock.expectOne((r) => r.url === 'api/v1/containers/c1' && r.params.get('token') === 'test.del.token');
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'deleted' });
  });

  it('should connect to stream via SseService', (done) => {
    const mockMetrics: ContainerLiveMetrics[] = [
      {
        container_id: 'c1',
        name: 'redis',
        cpu_percent: 1.2,
        memory_bytes: 1000000,
        memory_limit: 10000000,
        memory_percent: 10.0,
        state: 'running',
        health: 'healthy',
      },
    ];
    sseMock.connect.mockReturnValue(of(mockMetrics));

    service.getContainersStream().subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].name).toBe('redis');
      expect(sseMock.connect).toHaveBeenCalledWith('api/v1/containers/stream');
      done();
    });
  });
});
