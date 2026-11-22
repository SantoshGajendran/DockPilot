import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { EventsComponent } from './events.component';
import { EventsStore } from './events.store';
import { EventsService } from '../../core/services/events.service';
import { EventItem, EventsListResponse } from '../../core/models/events.model';

describe('EventsComponent', () => {
  let component: EventsComponent;
  let fixture: ComponentFixture<EventsComponent>;
  let eventsServiceMock: {
    getEvents: jest.Mock;
    streamEvents: jest.Mock;
  };

  const mockEvents: EventItem[] = [
    {
      id: '1',
      event_id: 'ev-1',
      timestamp: new Date().toISOString(),
      action: 'start',
      container_id: 'c-1',
      container_name: 'dockpilot-api',
      is_oom: false,
      is_unexpected_exit: false,
      is_restart_loop: false,
      attributes: {},
    },
  ];

  const mockResponse: EventsListResponse = {
    items: mockEvents,
    total: 1,
    has_more: true,
    next_cursor: '1',
  };

  beforeEach(async () => {
    eventsServiceMock = {
      getEvents: jest.fn().mockReturnValue(of(mockResponse)),
      streamEvents: jest.fn().mockReturnValue(of()),
    };

    await TestBed.configureTestingModule({
      imports: [EventsComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: EventsService, useValue: eventsServiceMock },
      ],
    })
    .overrideComponent(EventsComponent, {
      set: {
        providers: [EventsStore],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load events on init', () => {
    expect(component).toBeTruthy();
    expect(eventsServiceMock.getEvents).toHaveBeenCalled();
    expect(component.store.events().length).toBe(1);
    expect(component.store.total()).toBe(1);
  });

  it('should apply container name filter', () => {
    component.filterContainerName = 'dockpilot';
    component.applyFilters();

    expect(eventsServiceMock.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ container_name: 'dockpilot' })
    );
  });

  it('should clear filters', () => {
    component.filterContainerName = 'dockpilot';
    component.clearFilters();

    expect(component.filterContainerName).toBe('');
    expect(eventsServiceMock.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ container_name: undefined })
    );
  });

  it('should display empty state when events list is empty', () => {
    eventsServiceMock.getEvents.mockReturnValue(of({ items: [], total: 0, has_more: false }));
    component.store.loadEvents();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('No Events Found');
  });

  it('should load more events when clicking Load More button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const loadMoreBtn = compiled.querySelector('.pagination-footer button') as HTMLButtonElement;
    expect(loadMoreBtn).toBeTruthy();

    eventsServiceMock.getEvents.mockReturnValue(
      of({ items: [], total: 1, has_more: false, next_cursor: null })
    );
    loadMoreBtn.click();
    expect(eventsServiceMock.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: '1' })
    );
  });
});
