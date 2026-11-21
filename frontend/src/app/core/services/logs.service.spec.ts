import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { LogsService } from './logs.service';
import { SseService } from './sse.service';
import { LogSearchResponse } from '../models/logs.model';

describe('LogsService', () => {
  let service: LogsService;
  let httpMock: HttpTestingController;
  let sseMock: { connect: jest.Mock };

  beforeEach(() => {
    sseMock = {
      connect: jest.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [
        LogsService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SseService, useValue: sseMock },
      ],
    });

    service = TestBed.inject(LogsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query searchLogs with params', () => {
    const mockResponse: LogSearchResponse = {
      lines: [],
      total: 0,
      bytes_scanned: 100,
      capped: false,
    };

    service
      .searchLogs({
        container_ids: ['c1', 'c2'],
        q: 'error',
        regex: true,
      })
      .subscribe((res) => {
        expect(res.total).toBe(0);
      });

    const req = httpMock.expectOne((r) =>
      r.url.includes('api/v1/logs/search') &&
      r.params.get('container_ids') === 'c1,c2' &&
      r.params.get('q') === 'error' &&
      r.params.get('regex') === 'true'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should stream container logs via SseService', () => {
    service.streamContainerLogs('c1', 100).subscribe();
    expect(sseMock.connect).toHaveBeenCalledWith('api/v1/containers/c1/logs?tail=100&follow=true');
  });
});
