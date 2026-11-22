import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { EventItem, EventsFilter } from '../../core/models/events.model';
import { EventsService } from '../../core/services/events.service';

@Injectable()
export class EventsStore {
  private readonly eventsService = inject(EventsService);
  private streamSub: Subscription | null = null;

  readonly events = signal<EventItem[]>([]);
  readonly total = signal<number>(0);
  readonly hasMore = signal<boolean>(false);
  readonly nextCursor = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingMore = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly filters = signal<EventsFilter>({ limit: 50 });
  readonly isLive = signal<boolean>(true);

  init(): void {
    this.loadEvents();
    if (this.isLive()) {
      this.startStream();
    }
  }

  destroy(): void {
    this.stopStream();
  }

  setFilter(update: Partial<EventsFilter>): void {
    this.filters.update((prev) => ({ ...prev, ...update, cursor: undefined }));
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const f = this.filters();
    this.eventsService.getEvents(f).subscribe({
      next: (resp) => {
        this.events.set(resp.items);
        this.total.set(resp.total);
        this.hasMore.set(resp.has_more);
        this.nextCursor.set(resp.next_cursor || null);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load events');
        this.isLoading.set(false);
      },
    });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.isLoadingMore()) {
      return;
    }

    this.isLoadingMore.set(true);
    const f: EventsFilter = { ...this.filters(), cursor };

    this.eventsService.getEvents(f).subscribe({
      next: (resp) => {
        this.events.update((prev) => [...prev, ...resp.items]);
        this.total.set(resp.total);
        this.hasMore.set(resp.has_more);
        this.nextCursor.set(resp.next_cursor || null);
        this.isLoadingMore.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load more events');
        this.isLoadingMore.set(false);
      },
    });
  }

  toggleLive(): void {
    const next = !this.isLive();
    this.isLive.set(next);
    if (next) {
      this.startStream();
    } else {
      this.stopStream();
    }
  }

  startStream(): void {
    this.stopStream();
    this.streamSub = this.eventsService.streamEvents().subscribe({
      next: (item) => {
        this.handleIncomingEvent(item);
      },
      error: () => {
        // SSE service handles reconnection automatically
      },
    });
  }

  stopStream(): void {
    if (this.streamSub) {
      this.streamSub.unsubscribe();
      this.streamSub = null;
    }
  }

  handleIncomingEvent(item: EventItem): void {
    if (!item || !item.id) return;

    // Check filter criteria
    const f = this.filters();
    if (f.container_id && item.container_id !== f.container_id) return;
    if (f.container_name && !item.container_name.toLowerCase().includes(f.container_name.toLowerCase())) return;
    if (f.action && item.action !== f.action) return;
    if (f.incidents_only && !item.is_oom && !item.is_unexpected_exit && !item.is_restart_loop) return;

    // Prepend if not already present
    this.events.update((prev) => {
      if (prev.some((e) => e.id === item.id || e.event_id === item.event_id)) {
        return prev;
      }
      return [item, ...prev];
    });
    this.total.update((prev) => prev + 1);
  }
}
