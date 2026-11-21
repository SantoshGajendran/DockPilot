import { ComposeAction } from '../models/compose.model';

export const COMPOSE_ENDPOINTS = {
  projects: '/api/v1/compose/projects',
  action: (name: string, action: string) => `/api/v1/compose/projects/${name}/${action}`,
  job: (id: string) => `/api/v1/jobs/${id}`,
  jobStream: (id: string) => `/api/v1/jobs/${id}/stream`,
};

export const COMPOSE_ACTIONS: { label: string; action: ComposeAction; icon: string; color: string }[] = [
  { label: 'Up', action: 'up', icon: 'play_arrow', color: 'primary' },
  { label: 'Down', action: 'down', icon: 'stop', color: 'warn' },
  { label: 'Restart', action: 'restart', icon: 'replay', color: 'accent' },
  { label: 'Pull', action: 'pull', icon: 'cloud_download', color: 'primary' },
  { label: 'Start', action: 'start', icon: 'play_circle_outline', color: 'primary' },
  { label: 'Stop', action: 'stop', icon: 'pause_circle_outline', color: 'warn' },
];

export const COMPOSE_STATUS_COLORS = {
  running: '#10b981',
  partially_running: '#f59e0b',
  stopped: '#64748b',
  unhealthy: '#ef4444',
  empty: '#94a3b8',
};
