import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ComposeService } from './compose.service';
import { SseService } from './sse.service';
import { COMPOSE_ENDPOINTS } from '../constants/compose.constants';
import { ComposeActionResponse, ComposeJob, ComposeProjectsListResponse, JobStreamEvent } from '../models/compose.model';

describe('ComposeService', () => {
  let service: ComposeService;
  let httpMock: HttpTestingController;
  let sseServiceMock: { connect: jest.Mock };

  beforeEach(() => {
    sseServiceMock = {
      connect: jest.fn().mockReturnValue(of({ job_id: '123', status: 'running', line: 'Starting' })),
    };

    TestBed.configureTestingModule({
      providers: [
        ComposeService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SseService, useValue: sseServiceMock },
      ],
    });

    service = TestBed.inject(ComposeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch compose projects', () => {
    const mockResponse: ComposeProjectsListResponse = {
      projects: [
        {
          name: 'dockpilot',
          status: 'running',
          containers_count: 2,
          running_count: 2,
          config_files: ['docker-compose.yml'],
          working_dir: '.',
          services: [],
        },
      ],
      total: 1,
    };

    service.getProjects().subscribe((resp) => {
      expect(resp.total).toBe(1);
      expect(resp.projects[0].name).toBe('dockpilot');
    });

    const req = httpMock.expectOne(COMPOSE_ENDPOINTS.projects);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should execute compose action', () => {
    const mockActionResp: ComposeActionResponse = {
      job_id: 'job-123',
      project_name: 'dockpilot',
      action: 'up',
      status: 'running',
    };

    service.executeAction('dockpilot', 'up').subscribe((resp) => {
      expect(resp.job_id).toBe('job-123');
      expect(resp.status).toBe('running');
    });

    const req = httpMock.expectOne(COMPOSE_ENDPOINTS.action('dockpilot', 'up'));
    expect(req.request.method).toBe('POST');
    req.flush(mockActionResp);
  });

  it('should get job status', () => {
    const mockJob: ComposeJob = {
      id: 'job-123',
      project_name: 'dockpilot',
      action: 'up',
      status: 'completed',
      exit_code: 0,
      created_at: '2026-11-21T10:00:00Z',
      logs: ['Done'],
    };

    service.getJob('job-123').subscribe((job) => {
      expect(job.status).toBe('completed');
      expect(job.logs.length).toBe(1);
    });

    const req = httpMock.expectOne(COMPOSE_ENDPOINTS.job('job-123'));
    expect(req.request.method).toBe('GET');
    req.flush(mockJob);
  });

  it('should stream job events via sse', (done) => {
    service.streamJob('job-123').subscribe((event) => {
      expect(event.job_id).toBe('123');
      expect(event.status).toBe('running');
      done();
    });

    expect(sseServiceMock.connect).toHaveBeenCalledWith(COMPOSE_ENDPOINTS.jobStream('job-123'));
  });
});
