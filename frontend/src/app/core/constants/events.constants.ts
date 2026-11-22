export const EVENTS_ENDPOINTS = {
  events: '/api/v1/events',
  stream: '/api/v1/events/stream',
};

export interface EventActionMeta {
  action: string;
  label: string;
  icon: string;
  colorClass: string;
}

export const EVENT_ACTIONS_MAP: Record<string, EventActionMeta> = {
  start: { action: 'start', label: 'Started', icon: 'play_arrow', colorClass: 'event-start' },
  stop: { action: 'stop', label: 'Stopped', icon: 'stop', colorClass: 'event-stop' },
  die: { action: 'die', label: 'Died', icon: 'cancel', colorClass: 'event-die' },
  restart: { action: 'restart', label: 'Restarted', icon: 'refresh', colorClass: 'event-restart' },
  oom: { action: 'oom', label: 'OOM Killed', icon: 'memory', colorClass: 'event-oom' },
  kill: { action: 'kill', label: 'Killed', icon: 'gavel', colorClass: 'event-kill' },
  pause: { action: 'pause', label: 'Paused', icon: 'pause', colorClass: 'event-pause' },
  unpause: { action: 'unpause', label: 'Resumed', icon: 'play_arrow', colorClass: 'event-unpause' },
  create: { action: 'create', label: 'Created', icon: 'add_circle_outline', colorClass: 'event-create' },
  destroy: { action: 'destroy', label: 'Destroyed', icon: 'delete_outline', colorClass: 'event-destroy' },
};

export const DEFAULT_EVENT_META: EventActionMeta = {
  action: 'unknown',
  label: 'Event',
  icon: 'info',
  colorClass: 'event-default',
};

export function getEventActionMeta(action: string): EventActionMeta {
  const norm = action.toLowerCase();
  if (norm.startsWith('health_status')) {
    if (norm.includes('healthy') && !norm.includes('unhealthy')) {
      return { action, label: 'Healthy', icon: 'check_circle', colorClass: 'event-healthy' };
    }
    return { action, label: 'Unhealthy', icon: 'warning', colorClass: 'event-unhealthy' };
  }
  return EVENT_ACTIONS_MAP[norm] || {
    action,
    label: action.charAt(0).toUpperCase() + action.slice(1),
    icon: 'info',
    colorClass: 'event-default',
  };
}

export const EVENT_ACTION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Actions' },
  { value: 'start', label: 'Started (start)' },
  { value: 'stop', label: 'Stopped (stop)' },
  { value: 'die', label: 'Died (die)' },
  { value: 'restart', label: 'Restarted (restart)' },
  { value: 'oom', label: 'OOM (oom)' },
  { value: 'kill', label: 'Killed (kill)' },
  { value: 'pause', label: 'Paused (pause)' },
];
