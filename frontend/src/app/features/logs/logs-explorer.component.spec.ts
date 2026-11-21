import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { LogsExplorerComponent } from './logs-explorer.component';
import { LogsStore } from './logs.store';

describe('LogsExplorerComponent', () => {
  let component: LogsExplorerComponent;
  let fixture: ComponentFixture<LogsExplorerComponent>;
  let mockStore: any;

  beforeEach(async () => {
    mockStore = {
      containers: signal([
        { id: 'c1', name: 'dockpilot-redis', image: 'redis:alpine' },
      ]),
      selectedContainerIds: signal(new Set(['c1'])),
      searchQuery: signal(''),
      isRegex: signal(false),
      timeRange: signal('1h'),
      levelFilter: signal('ALL'),
      streamFilter: signal('all'),
      displayedLines: signal([
        {
          container_id: 'c1',
          container_name: 'dockpilot-redis',
          stream: 'stdout',
          timestamp: '2026-11-21T10:00:00Z',
          message: 'Redis server is up',
          level: 'INFO',
        },
      ]),
      loading: signal(false),
      bytesScanned: signal(1024),
      isCapped: signal(false),
      selectedCount: signal(1),
      allSelected: signal(true),
      loadContainers: jest.fn(),
      toggleContainer: jest.fn(),
      toggleAll: jest.fn(),
      setTimeRange: jest.fn(),
      setSearchQuery: jest.fn(),
      toggleRegex: jest.fn(),
      setLevelFilter: jest.fn(),
      setStreamFilter: jest.fn(),
      fetchLogs: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LogsExplorerComponent, NoopAnimationsModule],
    })
      .overrideComponent(LogsExplorerComponent, {
        set: {
          providers: [{ provide: LogsStore, useValue: mockStore }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LogsExplorerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load containers on init', () => {
    expect(component).toBeTruthy();
    expect(mockStore.loadContainers).toHaveBeenCalled();
  });

  it('should update search query on input', () => {
    const inputEvent = { target: { value: 'error' } } as unknown as Event;
    component.onSearchInput(inputEvent);
    expect(mockStore.setSearchQuery).toHaveBeenCalledWith('error');
  });
});
