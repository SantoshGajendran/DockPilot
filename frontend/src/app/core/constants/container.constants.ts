export const CONTAINER_ENDPOINTS = {
  list: 'api/v1/containers',
  stream: 'api/v1/containers/stream',
  bulk: 'api/v1/containers/bulk',
  action: (id: string, action: string) => `api/v1/containers/${id}/${action}`,
  deleteToken: (id: string) => `api/v1/containers/${id}/delete-token`,
  delete: (id: string) => `api/v1/containers/${id}`,
  detail: (id: string) => `api/v1/containers/${id}`,
  detailStats: (id: string) => `api/v1/containers/${id}/stats`,
  detailMetrics: (id: string, range: string) => `api/v1/containers/${id}/metrics?range=${range}`,
  revealEnv: (id: string) => `api/v1/containers/${id}/env/reveal`,
  containerLogs: (id: string, tail: number = 200, follow: boolean = true) =>
    `api/v1/containers/${id}/logs?tail=${tail}&follow=${follow}`,
  searchLogs: 'api/v1/logs/search',
} as const;

export const METRIC_RANGES = ['1h', '6h', '24h', '7d'] as const;
export type MetricRange = (typeof METRIC_RANGES)[number];


export const CONTAINER_STATE_COLORS: Record<string, string> = {
  running: '#22c55e',
  exited: '#ef4444',
  restarting: '#eab308',
  unhealthy: '#f97316',
  paused: '#64748b',
  unknown: '#94a3b8',
};

export const CONTAINER_HEALTH_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  unhealthy: '#ef4444',
  starting: '#eab308',
  none: '#64748b',
};

export const CONTAINER_FILTER_STORAGE_KEY = 'dockpilot_container_filter_presets';

export const DEFAULT_CONTAINER_PRESETS = [
  { name: 'All Containers', filters: {} },
  { name: 'Running Only', filters: { state: 'running' } },
  { name: 'Exited Only', filters: { state: 'exited' } },
  { name: 'Unhealthy Only', filters: { health: 'unhealthy' } },
] as const;
