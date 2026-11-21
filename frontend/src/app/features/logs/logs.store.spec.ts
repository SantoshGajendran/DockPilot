import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LogsStore } from './logs.store';
import { LogsService } from '../../core/services/logs.service';
import { ContainersService } from '../../core/services/containers.service';
import { ToastService } from '../../core/services/toast.service';
import { ContainerSummary } from '../../core/models/container.model';
import { LogEntry, LogSearchResponse } from '../../core/models/logs.model';

describe('LogsStore', () => {
  let store: LogsStore;
  let logsServiceMock: Partial<LogsService>;
  let containersServiceMock: Partial<ContainersService>;
  let toastMock: Partial<ToastService>;

  const mockContainers: ContainerSummary[] = [
    {
      id: 'c1',
      name: 'dockpilot-redis',
      image: 'redis:alpine',
      state: 'running',
      status: 'Up',
      health: 'healthy',
      restart_count: 0,
      created: '',
      ports: {},
      labels: {},
    },
    {
      id: 'c2',
      name: 'web-nginx',
      image: 'nginx:alpine',
      state: 'running',
      status: 'Up',
      health: 'none',
      restart_count: 0,
      created: '',
      ports: {},
      labels: {},
    },
  ];

  const mockLogResponse: LogSearchResponse = {
    lines: [
      {
        container_id: 'c1',
        container_name: 'dockpilot-redis',
        stream: 'stdout',
        timestamp: '2026-11-21T10:00:00Z',
        message: 'Started successfully',
        level: 'INFO',
      },
      {
        container_id: 'c2',
        container_name: 'web-nginx',
        stream: 'stderr',
        timestamp: '2026-11-21T10:01:00Z',
        message: 'Warning in config',
        level: 'WARN',
      },
    ],
    total: 2,
    bytes_scanned: 500,
    capped: false,
  };

  beforeEach(() => {
    logsServiceMock = {
      searchLogs: jest.fn().mockReturnValue(of(mockLogResponse)),
    };

    containersServiceMock = {
      listContainers: jest.fn().mockReturnValue(
        of({ items: mockContainers, total: 2, page: 1, page_size: 100, total_pages: 1 })
      ),
    };

    toastMock = {
      error: jest.fn(),
      success: jest.fn(),
      info: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        LogsStore,
        { provide: LogsService, useValue: logsServiceMock },
        { provide: ContainersService, useValue: containersServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    store = TestBed.inject(LogsStore);
  });

  it('should initialize with default states', () => {
    expect(store.containers().length).toBe(0);
    expect(store.timeRange()).toBe('1h');
    expect(store.levelFilter()).toBe('ALL');
  });

  it('should load containers and default select all', () => {
    store.loadContainers();

    expect(store.containers().length).toBe(2);
    expect(store.selectedCount()).toBe(2);
    expect(store.allSelected()).toBe(true);
    expect(logsServiceMock.searchLogs).toHaveBeenCalled();
  });

  it('should toggle container selection', () => {
    store.loadContainers();
    store.toggleContainer('c1');

    expect(store.selectedContainerIds().has('c1')).toBe(false);
    expect(store.selectedCount()).toBe(1);
  });

  it('should filter displayed lines by level and stream', () => {
    store.loadContainers();
    expect(store.displayedLines().length).toBe(2);

    store.setLevelFilter('WARN');
    expect(store.displayedLines().length).toBe(1);
    expect(store.displayedLines()[0].level).toBe('WARN');

    store.setLevelFilter('ALL');
    store.setStreamFilter('stdout');
    expect(store.displayedLines().length).toBe(1);
    expect(store.displayedLines()[0].stream).toBe('stdout');
  });
});
