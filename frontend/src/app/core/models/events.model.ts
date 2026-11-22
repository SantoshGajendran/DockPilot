export interface EventItem {
  id: string;
  event_id: string;
  timestamp: string;
  action: string;
  container_id: string;
  container_name: string;
  image?: string;
  exit_code?: number | null;
  is_oom: boolean;
  is_unexpected_exit: boolean;
  is_restart_loop: boolean;
  attributes: Record<string, any>;
}

export interface EventsListResponse {
  items: EventItem[];
  total: number;
  next_cursor?: string | null;
  has_more: boolean;
}

export interface EventsFilter {
  container_id?: string;
  container_name?: string;
  action?: string;
  incidents_only?: boolean;
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
}

export interface DayGroupedEvents {
  dayLabel: string;
  events: EventItem[];
}
