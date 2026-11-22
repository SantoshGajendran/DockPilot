import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventsService } from './events.service';
import { SseService } from './sse.service';
import { of } from 'rxjs';
import { EventItem, EventsListResponse } from '../models/events.model';

describe('EventsService', () => {
  let service: EventsService;
  let httpMock: HttpTestingController;
  let sseMock: { connect: jest.Mock };

  beforeEach(() => {
    sseMock = { connect: jest.fn().mockReturnValue(of()) };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        EventsService,
        { provide: SseService, useValue: sseMock },
      ],
    });

    service = TestBed.inject(EventsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch events with query parameters', () => {
    const mockResponse: EventsListResponse = {
      items: [
        {
          id: '1',
          event_id: 'ev-1',
          timestamp: '2026-11-22T10:00:00Z',
          action: 'start',
          container_id: 'c-1',
          container_name: 'test-c',
          is_oom: false,
          is_unexpected_exit: false,
          is_restart_loop: false,
          attributes: {},
        },
      ],
      total: 1,
      has_more: false,
    };

    service.getEvents({ container_name: 'test', incidents_only: true, limit: 20 }).subscribe((res) => {
      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
    });

    const req = httpMock.expectOne((r) =>
      r.url === '/api/v1/events' &&
      r.params.get('container_name') === 'test' &&
      r.params.get('incidents_only') === 'true' &&
      r.params.get('limit') === '20'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should delegate streamEvents to SseService', () => {
    service.streamEvents();
    expect(sseMock.connect).toHaveBeenCalledWith('/api/v1/events/stream');
  });
});
