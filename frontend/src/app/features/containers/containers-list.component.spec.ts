import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ContainersListComponent } from './containers-list.component';
import { ContainersStore } from './containers.store';
import { AuthService } from '../../core/services/auth.service';
import { ActionConfirmDialogComponent } from './dialogs/action-confirm-dialog.component';
import { DeleteContainerDialogComponent } from './dialogs/delete-container-dialog.component';
import { ContainerSummary } from '../../core/models/container.model';

describe('ContainersListComponent', () => {
  let component: ContainersListComponent;
  let fixture: ComponentFixture<ContainersListComponent>;
  let storeMock: jest.Mocked<Partial<ContainersStore>>;
  let authMock: jest.Mocked<Partial<AuthService>>;
  let dialogMock: { open: jest.Mock };

  const mockContainer: ContainerSummary = {
    id: 'c1',
    name: 'dockpilot-redis',
    image: 'redis:7-alpine',
    state: 'running',
    status: 'Up 2 hours',
    health: 'healthy',
    restart_count: 0,
    created: '2026-11-20T10:00:00Z',
    ports: { '6379/tcp': [{ HostPort: '6379' }] },
    labels: {},
    compose_project: 'dockpilot',
  };

  beforeEach(async () => {
    storeMock = {
      containers: jest.fn().mockReturnValue([mockContainer]) as any,
      total: jest.fn().mockReturnValue(1) as any,
      page: jest.fn().mockReturnValue(1) as any,
      pageSize: jest.fn().mockReturnValue(20) as any,
      totalPages: jest.fn().mockReturnValue(1) as any,
      loading: jest.fn().mockReturnValue(false) as any,
      error: jest.fn().mockReturnValue(null) as any,
      filters: jest.fn().mockReturnValue({ q: '', state: '', health: '', compose_project: '' }) as any,
      selectedIds: jest.fn().mockReturnValue(new Set()) as any,
      selectedCount: jest.fn().mockReturnValue(0) as any,
      allSelected: jest.fn().mockReturnValue(false) as any,
      isIndeterminate: jest.fn().mockReturnValue(false) as any,
      liveMetrics: jest.fn().mockReturnValue(new Map()) as any,
      presets: jest.fn().mockReturnValue([]) as any,
      loadContainers: jest.fn(),
      initStream: jest.fn(),
      destroyStream: jest.fn(),
      optimisticAction: jest.fn(),
      deleteContainer: jest.fn(),
      setFilter: jest.fn(),
      clearFilters: jest.fn(),
      setSort: jest.fn(),
      setPage: jest.fn(),
      toggleSelect: jest.fn(),
      toggleSelectAll: jest.fn(),
      clearSelection: jest.fn(),
      savePreset: jest.fn(),
      loadPreset: jest.fn(),
      executeBulkAction: jest.fn(),
    };

    authMock = {
      hasRole: jest.fn().mockReturnValue(true),
    };

    dialogMock = {
      open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }),
      openDialogs: [],
    };

    await TestBed.configureTestingModule({
      imports: [ContainersListComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: ContainersStore, useValue: storeMock },
        { provide: AuthService, useValue: authMock },
        { provide: MatDialog, useValue: dialogMock },
      ],
    })
    .overrideComponent(ContainersListComponent, {
      set: {
        providers: [
          { provide: MatDialog, useValue: dialogMock },
        ],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContainersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize store and stream', () => {
    expect(component).toBeTruthy();
    expect(storeMock.loadContainers).toHaveBeenCalled();
    expect(storeMock.initStream).toHaveBeenCalled();
  });

  it('should destroy stream on component destroy', () => {
    component.ngOnDestroy();
    expect(storeMock.destroyStream).toHaveBeenCalled();
  });

  it('should format ports correctly', () => {
    const formatted = component.formatPorts(mockContainer.ports);
    expect(formatted).toBe('6379->6379/tcp');

    expect(component.formatPorts({})).toBe('-');
  });

  it('should format bytes to human readable string', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
  });

  it('should open ActionConfirmDialogComponent on stop and call optimisticAction when confirmed', () => {
    component.onActionClick(mockContainer, 'stop');
    expect(dialogMock.open).toHaveBeenCalledWith(ActionConfirmDialogComponent, {
      data: { action: 'stop', containerName: 'dockpilot-redis' },
    });
    expect(storeMock.optimisticAction).toHaveBeenCalledWith('c1', 'stop');
  });

  it('should open DeleteContainerDialogComponent on delete and call deleteContainer when confirmed', () => {
    component.onDeleteClick(mockContainer);
    expect(dialogMock.open).toHaveBeenCalledWith(DeleteContainerDialogComponent, {
      data: { containerId: 'c1', containerName: 'dockpilot-redis' },
    });
    expect(storeMock.deleteContainer).toHaveBeenCalledWith('c1', 'dockpilot-redis');
  });

  it('should have explicit aria-label attributes on action buttons and container links', () => {
    const link = fixture.nativeElement.querySelector('.container-name-cell a');
    expect(link).toBeTruthy();
    if (link) {
      expect(link.getAttribute('aria-label')).toContain('View details for container');
    }
    const actionButtons = fixture.nativeElement.querySelectorAll('.actions-cell button');
    expect(actionButtons.length).toBeGreaterThan(0);
    actionButtons.forEach((btn: HTMLButtonElement) => {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
