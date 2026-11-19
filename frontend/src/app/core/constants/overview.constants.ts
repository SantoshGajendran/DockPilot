export const OVERVIEW_ENDPOINTS = {
  overview: '/api/v1/overview',
  stream: '/api/v1/overview/stream'
} as const;

export const CONTAINER_STATE_LABELS = {
  running: 'Running',
  exited: 'Exited',
  restarting: 'Restarting',
  unhealthy: 'Unhealthy',
  paused: 'Paused'
} as const;

export const CONTAINER_STATE_COLORS = {
  running: '#22c55e',
  exited: '#ef4444',
  restarting: '#eab308',
  unhealthy: '#f97316',
  paused: '#64748b'
} as const;

export const DASHBOARD_CONSTANTS = {
  watchdogIntervalMs: 1000,
  metricsIntervalSeconds: 3,
  staleThresholdMultiplier: 2.0,
  staleThresholdMs: 6000,
  topCpuColor: '#3b82f6',
  topMemoryColor: '#8b5cf6'
} as const;

export const HOST_THRESHOLDS = {
  cpu: { warn: 70, danger: 85 },
  memory: { warn: 75, danger: 90 },
  disk: { warn: 80, danger: 90 }
} as const;
