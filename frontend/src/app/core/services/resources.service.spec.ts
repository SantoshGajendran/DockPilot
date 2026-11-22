import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ResourcesService, RESOURCES_ENDPOINTS } from './resources.service';
import { SseService } from './sse.service';
import {
  ImagesListResponse,
  NetworksListResponse,
  PrunePreviewResponse,
  PruneResultResponse,
  VolumesListResponse,
} from '../models/resources.model';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let httpMock: HttpTestingController;
  let sseServiceMock: { connect: jest.Mock };

  beforeEach(() => {
    sseServiceMock = {
      connect: jest.fn().mockReturnValue(of({ job_id: 'job-1', status: 'running', line: 'Pulling...' })),
    };

    TestBed.configureTestingModule({
      providers: [
        ResourcesService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SseService, useValue: sseServiceMock },
      ],
    });

    service = TestBed.inject(ResourcesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get images', () => {
    const mockResp: ImagesListResponse = {
      images: [
        {
          id: 'img1',
          short_id: 'img1',
          tags: ['redis:7-alpine'],
          size: 1000,
          created: '2026-11-20',
          labels: {},
          is_dangling: false,
          is_in_use: true,
          in_use_by: [{ id: 'c1', name: 'dockpilot-redis', state: 'running' }],
          is_protected: true,
        },
      ],
      total_size: 1000,
      total_count: 1,
    };

    service.getImages().subscribe((res) => {
      expect(res.images.length).toBe(1);
      expect(res.total_size).toBe(1000);
    });

    const req = httpMock.expectOne(RESOURCES_ENDPOINTS.images);
    expect(req.request.method).toBe('GET');
    req.flush(mockResp);
  });

  it('should remove an image', () => {
    service.removeImage('test-image').subscribe((res) => {
      expect(res.ok).toBe(true);
    });

    const req = httpMock.expectOne(RESOURCES_ENDPOINTS.removeImage('test-image'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true, message: 'Deleted' });
  });

  it('should initiate pull image job', () => {
    service.pullImage('alpine:latest').subscribe((res) => {
      expect(res.id).toBe('job-123');
    });

    const req = httpMock.expectOne(RESOURCES_ENDPOINTS.pullImage);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ image_name: 'alpine:latest' });
    req.flush({ id: 'job-123', status: 'pending' });
  });

  it('should preview and confirm image prune', () => {
    const mockPreview: PrunePreviewResponse = {
      resource_type: 'images',
      items_count: 2,
      space_reclaimed_bytes: 5000,
      items: [],
      confirmation_token: 'token-abc',
      expires_at: '2026-11-23T00:00:00Z',
    };

    service.previewPruneImages().subscribe((res) => {
      expect(res.confirmation_token).toBe('token-abc');
    });

    const req1 = httpMock.expectOne(RESOURCES_ENDPOINTS.pruneImagesPreview);
    expect(req1.request.method).toBe('POST');
    req1.flush(mockPreview);

    const mockResult: PruneResultResponse = {
      resource_type: 'images',
      items_deleted: ['img1', 'img2'],
      space_reclaimed_bytes: 5000,
    };

    service.confirmPruneImages('token-abc').subscribe((res) => {
      expect(res.items_deleted.length).toBe(2);
    });

    const req2 = httpMock.expectOne(RESOURCES_ENDPOINTS.pruneImagesConfirm);
    expect(req2.request.method).toBe('POST');
    expect(req2.request.body).toEqual({ confirmation_token: 'token-abc' });
    req2.flush(mockResult);
  });

  it('should get volumes', () => {
    const mockResp: VolumesListResponse = {
      volumes: [
        {
          name: 'vol1',
          driver: 'local',
          mountpoint: '/path',
          created: '2026-11-20',
          labels: {},
          size: 200,
          is_in_use: false,
          in_use_by: [],
          is_protected: false,
        },
      ],
      total_count: 1,
    };

    service.getVolumes().subscribe((res) => {
      expect(res.volumes.length).toBe(1);
    });

    const req = httpMock.expectOne(RESOURCES_ENDPOINTS.volumes);
    expect(req.request.method).toBe('GET');
    req.flush(mockResp);
  });

  it('should get networks', () => {
    const mockResp: NetworksListResponse = {
      networks: [
        {
          id: 'net1',
          short_id: 'n1',
          name: 'bridge',
          driver: 'bridge',
          scope: 'local',
          internal: false,
          created: '2026-11-20',
          labels: {},
          connected_container_ids: [],
          is_in_use: false,
          in_use_by: [],
          is_built_in: true,
          is_protected: true,
        },
      ],
      total_count: 1,
    };

    service.getNetworks().subscribe((res) => {
      expect(res.networks.length).toBe(1);
    });

    const req = httpMock.expectOne(RESOURCES_ENDPOINTS.networks);
    expect(req.request.method).toBe('GET');
    req.flush(mockResp);
  });

  it('should stream job output via SseService', (done) => {
    service.streamJob('job-1').subscribe((event) => {
      expect(event.job_id).toBe('job-1');
      expect(sseServiceMock.connect).toHaveBeenCalledWith(RESOURCES_ENDPOINTS.jobStream('job-1'));
      done();
    });
  });
});
