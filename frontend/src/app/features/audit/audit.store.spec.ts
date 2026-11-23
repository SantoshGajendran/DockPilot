import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuditStore } from './audit.store';
import { AuditService } from '../../core/services/audit.service';
import { ToastService } from '../../core/services/toast.service';
import { AuditLog, AuditLogsListResponse } from '../../core/models/audit.model';

describe('AuditStore', () => {
  let store: AuditStore;
  let auditServiceMock: {
    listAuditLogs: jest.Mock;
    exportAuditCsv: jest.Mock;
    downloadBlob: jest.Mock;
  };
  let toastMock: {
    show: jest.Mock;
  };

  const mockLog1: AuditLog = {
    id: '1',
    timestamp: '2026-11-23T10:00:00Z',
    username: 'admin',
    action: 'container.stop',
    target_type: 'container',
    target_id: 'c1',
    result: 'success',
  };

  const mockResponse: AuditLogsListResponse = {
    items: [mockLog1],
    total: 1,
    page: 1,
    page_size: 50,
    total_pages: 1,
  };

  beforeEach(() => {
    auditServiceMock = {
      listAuditLogs: jest.fn().mockReturnValue(of(mockResponse)),
      exportAuditCsv: jest.fn().mockReturnValue(of(new Blob())),
      downloadBlob: jest.fn(),
    };
    toastMock = {
      show: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuditStore,
        { provide: AuditService, useValue: auditServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    store = TestBed.inject(AuditStore);
  });

  it('should initialize and load logs', () => {
    store.init();
    expect(auditServiceMock.listAuditLogs).toHaveBeenCalled();
    expect(store.items().length).toBe(1);
    expect(store.total()).toBe(1);
    expect(store.isLoading()).toBe(false);
  });

  it('should handle load error', () => {
    auditServiceMock.listAuditLogs.mockReturnValue(throwError(() => new Error('Server error')));
    store.loadAuditLogs();
    expect(store.error()).toBe('Server error');
    expect(store.isLoading()).toBe(false);
  });

  it('should update filters and reset page to 1', () => {
    store.setFilter({ user: 'alice', result: 'success' });
    expect(store.filters().user).toBe('alice');
    expect(store.filters().result).toBe('success');
    expect(store.filters().page).toBe(1);
    expect(auditServiceMock.listAuditLogs).toHaveBeenCalled();
  });

  it('should set date preset', () => {
    store.setDatePreset('24h', 24);
    expect(store.datePreset()).toBe('24h');
    expect(store.filters().since).toBeDefined();
    expect(auditServiceMock.listAuditLogs).toHaveBeenCalled();
  });

  it('should change page and page size', () => {
    store.setPage(2);
    expect(store.filters().page).toBe(2);

    store.setPageSize(20);
    expect(store.filters().page_size).toBe(20);
    expect(store.filters().page).toBe(1);
  });

  it('should select and deselect items', () => {
    store.selectItem(mockLog1);
    expect(store.selectedItem()).toBe(mockLog1);

    store.selectItem(null);
    expect(store.selectedItem()).toBeNull();
  });

  it('should toggle relative/absolute time format', () => {
    expect(store.relativeTime()).toBe(true);
    store.toggleTimeFormat();
    expect(store.relativeTime()).toBe(false);
    store.toggleTimeFormat();
    expect(store.relativeTime()).toBe(true);
  });

  it('should export CSV and trigger download', () => {
    store.exportCsv();
    expect(auditServiceMock.exportAuditCsv).toHaveBeenCalled();
    expect(auditServiceMock.downloadBlob).toHaveBeenCalled();
    expect(toastMock.show).toHaveBeenCalledWith('Audit logs exported successfully');
    expect(store.isExporting()).toBe(false);
  });
});
