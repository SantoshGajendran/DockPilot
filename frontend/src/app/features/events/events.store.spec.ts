import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EventsStore } from './events.store';
import { EventsService } from '../../core/services/events.service';
import { EventItem, EventsListResponse } from '../../core/models/events.model';

describe('EventsStore', () => {
  let store: EventsStore;
  let eventsServiceMock: {
    getEvents: jest.Mock;
    streamEvents: jest.Mock;
  };

  const mockItem1: EventItem = {
    id: '1',
    event_id: 'ev-1',
    timestamp: '2026-11-22T10:00:00Z',
    action: 'start',
    container_id: 'c-1',
    container_name: 'web',
    is_oom: false,
    is_unexpected_exit: false,
    is_restart_loop: false,
    attributes: {},
  };

  const mockItem2: EventItem = {
    id: '2',
    event_id: 'ev-2',
    timestamp: '2026-11-22T09:00:00Z',
    action: 'die',
    container_id: 'c-2',
    container_name: 'db',
    is_oom: false,
    is_unexpected_exit: true,
    is_restart_loop: false,
    attributes: { exitCode: '1' },
  };

  const mockResponse: EventsListResponse = {
    items: [mockItem1],
    total: 1,
    has_more: true,
    next_cursor: '1',
  };

  beforeEach(() => {
    eventsServiceMock = {
      getEvents: jest.fn().mockReturnValue(of(mockResponse)),
      streamEvents: jest.fn().mockReturnValue(of()),
    };

    TestBed.configureTestingModule({
      providers: [
        EventsStore,
        { provide: EventsService, useValue: eventsServiceMock },
      ],
    });

    store = TestBed.inject(EventsStore);
  });

  afterEach(() => {
    store.destroy();
  });

  it('should load initial events on loadEvents()', () => {
    store.loadEvents();
    expect(eventsServiceMock.getEvents).toHaveBeenCalled();
    expect(store.events().length).toBe(1);
    expect(store.total()).toBe(1);
    expect(store.hasMore()).toBe(true);
    expect(store.nextCursor()).toBe('1');
  });

  it('should append items on loadMore()', () => {
    store.loadEvents();

    eventsServiceMock.getEvents.mockReturnValue(
      of({ items: [mockItem2], total: 2, has_more: false, next_cursor: null })
    );

    store.loadMore();
    expect(store.events().length).toBe(2);
    expect(store.hasMore()).toBe(false);
  });

  it('should handle live incoming events matching filters', () => {
    store.events.set([mockItem1]);
    store.total.set(1);

    store.handleIncomingEvent(mockItem2);

    expect(store.events().length).toBe(2);
    expect(store.events()[0].id).toBe('2');
    expect(store.total()).toBe(2);

    // Duplicate check
    store.handleIncomingEvent(mockItem2);
    expect(store.events().length).toBe(2);
  });

  it('should filter incoming events not matching active filter', () => {
    store.filters.set({ container_name: 'other' });
    store.events.set([]);

    store.handleIncomingEvent(mockItem1);
    expect(store.events().length).toBe(0);
  });

  it('should toggle live streaming', () => {
    expect(store.isLive()).toBe(true);
    store.toggleLive();
    expect(store.isLive()).toBe(false);
    store.toggleLive();
    expect(store.isLive()).toBe(true);
    expect(eventsServiceMock.streamEvents).toHaveBeenCalled();
  });
});
