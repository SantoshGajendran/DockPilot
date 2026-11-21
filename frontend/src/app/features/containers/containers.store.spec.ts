import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ContainersStore } from './containers.store';
import { ContainersService } from '../../core/services/containers.service';
import { ToastService } from '../../core/services/toast.service';
import { ContainerSummary, ContainersListResponse } from '../../core/models/container.model';

describe('ContainersStore', () => {
  let store: ContainersStore;
  let serviceMock: jest.Mocked<Partial<ContainersService>>;
  let toastMock: jest.Mocked<Partial<ToastService>>;

  const mockContainer: ContainerSummary = {
    id: 'c1',
    name: 'dockpilot-redis',
    image: 'redis:7-alpine',
    state: 'running',
    status: 'Up 2 hours',
    health: 'healthy',
    restart_count: 0,
    created: '2026-11-20T10:00:00Z',
    ports: {},
    labels: {},
    compose_project: 'dockpilot',
  };

  const mockResponse: ContainersListResponse = {
    items: [mockContainer],
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };

  beforeEach(() => {
    localStorage.clear();

    serviceMock = {
      listContainers: jest.fn().mockReturnValue(of(mockResponse)),
      executeAction: jest.fn().mockReturnValue(of({ message: 'ok' })),
      bulkAction: jest.fn().mockReturnValue(of({ results: [], total_success: 1, total_failed: 0 })),
      getDeleteToken: jest.fn().mockReturnValue(of({ token: 'tok', container_id: 'c1', expires_at: '' })),
      deleteContainer: jest.fn().mockReturnValue(of({ message: 'deleted' })),
      getContainersStream: jest.fn().mockReturnValue(of([])),
    };

    toastMock = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ContainersStore,
        { provide: ContainersService, useValue: serviceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    store = TestBed.inject(ContainersStore);
  });

  it('should initialize with default signals and load presets', () => {
    expect(store.containers().length).toBe(0);
    expect(store.selectedCount()).toBe(0);
    expect(store.presets().length).toBeGreaterThan(0);
  });

  it('should load containers and update signals', () => {
    store.loadContainers();
    expect(serviceMock.listContainers).toHaveBeenCalled();
    expect(store.containers().length).toBe(1);
    expect(store.total()).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('should toggle selection for one and all', () => {
    store.containers.set([mockContainer]);

    store.toggleSelect('c1');
    expect(store.selectedIds().has('c1')).toBe(true);
    expect(store.allSelected()).toBe(true);

    store.toggleSelect('c1');
    expect(store.selectedIds().has('c1')).toBe(false);
    expect(store.allSelected()).toBe(false);

    store.toggleSelectAll(true);
    expect(store.selectedCount()).toBe(1);

    store.clearSelection();
    expect(store.selectedCount()).toBe(0);
  });

  it('should perform optimistic action and rollback on error', () => {
    store.containers.set([mockContainer]);

    // Error case -> rollback
    serviceMock.executeAction = jest.fn().mockReturnValue(throwError(() => new Error('Docker error')));
    store.optimisticAction('c1', 'stop');

    expect(toastMock.error).toHaveBeenCalled();
    expect(store.containers()[0].state).toBe('running');
  });

  it('should handle preset saving, loading and deleting', () => {
    store.setFilter('state', 'running');
    store.savePreset('My Running');

    const saved = store.presets().find(p => p.name === 'My Running');
    expect(saved).toBeDefined();
    expect(saved?.filters.state).toBe('running');

    store.clearFilters();
    expect(store.filters().state).toBe('');

    store.loadPreset('My Running');
    expect(store.filters().state).toBe('running');

    store.deletePreset('My Running');
    expect(store.presets().find(p => p.name === 'My Running')).toBeUndefined();
  });
});
