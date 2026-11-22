import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TerminalService } from './terminal.service';
import { AuthService } from './auth.service';
import { TERMINAL_ENDPOINTS } from '../constants/terminal.constants';

describe('TerminalService', () => {
  let service: TerminalService;
  let httpMock: HttpTestingController;
  let authServiceMock: { getToken: jest.Mock };

  beforeEach(() => {
    authServiceMock = {
      getToken: jest.fn().mockReturnValue('mock-token-xyz'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TerminalService,
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(TerminalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch terminal status', () => {
    const mockStatus = {
      enabled: true,
      idle_timeout_seconds: 300,
      max_session_seconds: 3600,
      max_concurrent_sessions: 5,
      active_sessions_count: 1,
      record_sessions: true,
      allowed_shells: ['/bin/sh', '/bin/bash'],
    };

    service.getStatus('c1').subscribe((res) => {
      expect(res).toEqual(mockStatus);
    });

    const req = httpMock.expectOne(TERMINAL_ENDPOINTS.status('c1'));
    expect(req.request.method).toBe('GET');
    req.flush(mockStatus);
  });

  it('should fetch terminal sessions list', () => {
    const mockSessions = {
      sessions: [
        {
          id: '123',
          container_id: 'c1',
          container_name: 'dockpilot-redis',
          username: 'admin',
          shell: '/bin/sh',
          started_at: '2026-11-23T00:00:00Z',
          status: 'completed',
          bytes_sent: 10,
          bytes_received: 20,
        },
      ],
      total_count: 1,
    };

    service.getSessions('c1').subscribe((res) => {
      expect(res).toEqual(mockSessions);
    });

    const req = httpMock.expectOne(TERMINAL_ENDPOINTS.sessions('c1'));
    expect(req.request.method).toBe('GET');
    req.flush(mockSessions);
  });

  it('should construct websocket url with token and shell', () => {
    const url = service.buildWebSocketUrl('c1', '/bin/bash');
    expect(url).toContain('/api/v1/containers/c1/exec');
    expect(url).toContain('token=mock-token-xyz');
    expect(url).toContain('shell=%2Fbin%2Fbash');
  });
});
