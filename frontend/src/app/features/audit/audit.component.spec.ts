import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { AuditComponent } from './audit.component';
import { AuditStore } from './audit.store';
import { AuditService } from '../../core/services/audit.service';
import { ToastService } from '../../core/services/toast.service';
import { AuditLog, AuditLogsListResponse } from '../../core/models/audit.model';

describe('AuditComponent', () => {
  let component: AuditComponent;
  let fixture: ComponentFixture<AuditComponent>;
  let auditServiceMock: {
    listAuditLogs: jest.Mock;
    exportAuditCsv: jest.Mock;
    downloadBlob: jest.Mock;
  };
  let toastMock: {
    show: jest.Mock;
  };

  const mockLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: '2026-11-23T10:00:00Z',
      username: 'admin',
      action: 'container.restart',
      target_type: 'container',
      target_id: 'cont_web',
      result: 'success',
      payload: { force: true },
      ip_address: '127.0.0.1',
    },
    {
      id: 'log-2',
      timestamp: '2026-11-23T09:30:00Z',
      username: 'operator',
      action: 'compose.down',
      target_type: 'compose',
      target_id: 'stack_web',
      result: 'failure',
      error_message: 'Stack busy',
      ip_address: '192.168.1.5',
    },
  ];

  const mockResponse: AuditLogsListResponse = {
    items: mockLogs,
    total: 2,
    page: 1,
    page_size: 50,
    total_pages: 1,
  };

  beforeEach(async () => {
    auditServiceMock = {
      listAuditLogs: jest.fn().mockReturnValue(of(mockResponse)),
      exportAuditCsv: jest.fn().mockReturnValue(of(new Blob())),
      downloadBlob: jest.fn(),
    };
    toastMock = {
      show: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AuditComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: AuditService, useValue: auditServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    })
      .overrideComponent(AuditComponent, {
        set: {
          providers: [AuditStore],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AuditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load audit records', () => {
    expect(component).toBeTruthy();
    expect(auditServiceMock.listAuditLogs).toHaveBeenCalled();
    expect(component.store.items().length).toBe(2);
  });

  it('should apply filters', () => {
    component.filterUser = 'admin';
    component.filterAction = 'container.restart';
    component.filterTargetType = 'container';
    component.filterTargetId = 'cont_web';
    component.filterResult = 'success';
    component.applyFilters();

    expect(component.store.filters().user).toBe('admin');
    expect(component.store.filters().action).toBe('container.restart');
    expect(component.store.filters().target_type).toBe('container');
    expect(component.store.filters().target_id).toBe('cont_web');
    expect(component.store.filters().result).toBe('success');
  });

  it('should reset filters', () => {
    component.filterUser = 'admin';
    component.resetFilters();

    expect(component.filterUser).toBe('');
    expect(component.store.filters().user).toBeUndefined();
    expect(component.selectedDatePreset).toBe('all');
  });

  it('should handle date preset change', () => {
    component.onDatePresetChange('24h');
    expect(component.selectedDatePreset).toBe('24h');
    expect(component.store.filters().since).toBeDefined();
  });

  it('should open and close drawer', () => {
    component.openDrawer(mockLogs[0]);
    expect(component.store.selectedItem()).toBe(mockLogs[0]);

    component.closeDrawer();
    expect(component.store.selectedItem()).toBeNull();
  });

  it('should format timestamp in both relative and absolute formats', () => {
    const iso = '2026-11-23T10:00:00.000Z';
    const abs = component.formatTimestamp(iso, false);
    expect(abs).toContain('UTC');

    const rel = component.formatTimestamp(iso, true);
    expect(rel).toBeTruthy();

    expect(component.formatTimestamp('', true)).toBe('-');
  });

  it('should format and copy payload', async () => {
    const writeTextSpy = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    const jsonStr = component.formatPayload({ test: 123 });
    expect(jsonStr).toContain('"test": 123');

    component.copyPayload({ test: 123 });
    expect(writeTextSpy).toHaveBeenCalledWith(jsonStr);
  });

  it('should handle pagination event', () => {
    component.onPageChange({ pageIndex: 1, pageSize: 50, length: 100 });
    expect(component.store.filters().page).toBe(2);

    component.onPageChange({ pageIndex: 0, pageSize: 20, length: 100 });
    expect(component.store.filters().page_size).toBe(20);
    expect(component.store.filters().page).toBe(1);
  });
});
