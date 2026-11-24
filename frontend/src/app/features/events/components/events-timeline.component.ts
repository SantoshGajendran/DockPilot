import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DayGroupedEvents, EventItem } from '../../../core/models/events.model';
import { EventActionMeta, getEventActionMeta } from '../../../core/constants/events.constants';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'dp-events-timeline',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatChipsModule,
    MatTooltipModule,
    IconComponent,
  ],
  templateUrl: './events-timeline.component.html',
  styleUrls: ['./events-timeline.component.scss'],
})
export class EventsTimelineComponent {
  private readonly _events = signal<EventItem[]>([]);

  @Input()
  set events(val: EventItem[]) {
    this._events.set(val || []);
  }
  get events(): EventItem[] {
    return this._events();
  }

  @Input() compact = false;
  @Input() showContainerLink = true;

  readonly dayGroups = computed(() => {
    return this.groupEventsByDay(this._events());
  });

  getActionMeta(action: string): EventActionMeta {
    return getEventActionMeta(action);
  }

  getIconName(action: string): string {
    const norm = (action || '').toLowerCase();
    if (norm.includes('start') || norm === 'unpause') return 'play';
    if (norm.includes('stop')) return 'stop';
    if (norm.includes('restart')) return 'refresh-cw';
    if (norm.includes('die') || norm.includes('kill') || norm.includes('oom')) return 'alert-triangle';
    if (norm.includes('pause')) return 'pause';
    return 'info';
  }

  formatTime(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  }

  private groupEventsByDay(items: EventItem[]): DayGroupedEvents[] {
    const groups: Map<string, EventItem[]> = new Map();

    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    for (const item of items) {
      const d = new Date(item.timestamp);
      const itemDateStr = d.toDateString();

      let label: string;
      if (itemDateStr === todayStr) {
        label = 'Today';
      } else if (itemDateStr === yesterdayStr) {
        label = 'Yesterday';
      } else {
        label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label)!.push(item);
    }

    return Array.from(groups.entries()).map(([dayLabel, events]) => ({
      dayLabel,
      events,
    }));
  }
}
