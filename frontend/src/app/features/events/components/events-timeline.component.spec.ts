import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { EventsTimelineComponent } from './events-timeline.component';
import { EventItem } from '../../../core/models/events.model';

describe('EventsTimelineComponent', () => {
  let component: EventsTimelineComponent;
  let fixture: ComponentFixture<EventsTimelineComponent>;

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
    {
      id: '2',
      event_id: 'ev-2',
      timestamp: new Date().toISOString(),
      action: 'die',
      container_id: 'c-2',
      container_name: 'dockpilot-worker',
      exit_code: 1,
      is_oom: false,
      is_unexpected_exit: true,
      is_restart_loop: true,
      attributes: { exitCode: '1' },
    },
    {
      id: '3',
      event_id: 'ev-3',
      timestamp: new Date().toISOString(),
      action: 'oom',
      container_id: 'c-3',
      container_name: 'dockpilot-cache',
      is_oom: true,
      is_unexpected_exit: false,
      is_restart_loop: false,
      attributes: {},
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventsTimelineComponent, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(EventsTimelineComponent);
    component = fixture.componentInstance;
    component.events = mockEvents;
    fixture.detectChanges();
  });

  it('should create and group events by day', () => {
    expect(component).toBeTruthy();
    expect(component.dayGroups().length).toBe(1);
    expect(component.dayGroups()[0].dayLabel).toBe('Today');
    expect(component.dayGroups()[0].events.length).toBe(3);
  });

  it('should display action tags and container names', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('dockpilot-api');
    expect(compiled.textContent).toContain('Started');
    expect(compiled.textContent).toContain('dockpilot-worker');
  });

  it('should display incident chips for restart loop, OOM, and exit code', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.chip-loop')).toBeTruthy();
    expect(compiled.textContent).toContain('Restart Loop');

    expect(compiled.querySelector('.chip-oom')).toBeTruthy();
    expect(compiled.textContent).toContain('OOM Kill');

    expect(compiled.querySelector('.chip-crash')).toBeTruthy();
    expect(compiled.textContent).toContain('Exit 1');
  });

  it('should support compact mode', () => {
    component.compact = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.timeline-wrapper.compact-mode')).toBeTruthy();
  });
});
