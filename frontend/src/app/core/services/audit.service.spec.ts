import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuditService } from './audit.service';
import { AuditLogsListResponse, AuditLog } from '../models/audit.model';
import { AUDIT_ENDPOINTS } from '../constants/audit.constants';

describe('AuditService', () => {
  let service: AuditService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuditService],
    });

    service = TestBed.inject(AuditService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch audit logs with query parameters', () => {
    const mockResponse: AuditLogsListResponse = {
      items: [
        {
          id: 'test-id-1',
          timestamp: '2026-11-23T10:00:00Z',
          username: 'admin',
          action: 'container.stop',
          target_type: 'container',
          target_id: 'c1',
          result: 'success',
        },
      ],
      total: 1,
      page: 1,
      page_size: 50,
      total_pages: 1,
    };

    service
      .listAuditLogs({
        user: 'admin',
        action: 'container.stop',
        target_type: 'container',
        target_id: 'c1',
        result: 'success',
        page: 1,
        page_size: 50,
        sort_order: 'desc',
      })
      .subscribe((res) => {
        expect(res.total).toBe(1);
        expect(res.items.length).toBe(1);
        expect(res.items[0].action).toBe('container.stop');
      });

    const req = httpMock.expectOne((r) => r.url === AUDIT_ENDPOINTS.audit);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('user')).toBe('admin');
    expect(req.request.params.get('action')).toBe('container.stop');
    expect(req.request.params.get('target_type')).toBe('container');
    expect(req.request.params.get('target_id')).toBe('c1');
    expect(req.request.params.get('result')).toBe('success');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('page_size')).toBe('50');
    expect(req.request.params.get('sort_order')).toBe('desc');
    req.flush(mockResponse);
  });

  it('should get single audit log by id', () => {
    const mockLog: AuditLog = {
      id: 'log-123',
      timestamp: '2026-11-23T10:00:00Z',
      username: 'admin',
      action: 'compose.up',
      target_type: 'compose',
      result: 'success',
    };

    service.getAuditLog('log-123').subscribe((res) => {
      expect(res.id).toBe('log-123');
      expect(res.action).toBe('compose.up');
    });

    const req = httpMock.expectOne(`${AUDIT_ENDPOINTS.audit}/log-123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockLog);
  });

  it('should request CSV export blob', () => {
    const mockBlob = new Blob(['id,timestamp\n1,2026-11-23'], { type: 'text/csv' });

    service.exportAuditCsv({ result: 'failure' }).subscribe((blob) => {
      expect(blob).toBeTruthy();
      expect(blob.type).toBe('text/csv');
    });

    const req = httpMock.expectOne((r) => r.url === AUDIT_ENDPOINTS.export);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('result')).toBe('failure');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });

  it('should trigger browser download on downloadBlob', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const createObjectURLMock = jest.fn().mockReturnValue('blob:test');
    const revokeObjectURLMock = jest.fn();
    (window.URL as any).createObjectURL = createObjectURLMock;
    (window.URL as any).revokeObjectURL = revokeObjectURLMock;

    service.downloadBlob(blob, 'test.csv');
    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test');
  });
});
