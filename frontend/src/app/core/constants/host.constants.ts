export const HOST_ENDPOINTS = {
  info: '/api/v1/host/info',
  metrics: '/api/v1/host/metrics',
  history: (range: string = '1h') => `/api/v1/host/metrics/history?range=${range}`,
  dockerUsage: '/api/v1/host/docker-usage',
};

export const HOST_THRESHOLDS = {
  cpuWarning: 80,
  cpuCritical: 90,
  memoryWarning: 80,
  memoryCritical: 90,
  diskWarning: 80,
  diskCritical: 90,
  inodeWarning: 80,
  inodeCritical: 90,
};

export const HOST_METRICS_INTERVAL_MS = 3000;

export const HOST_COLORS = {
  normal: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  cpuCore: '#3b82f6',
  memory: '#8b5cf6',
  swap: '#ec4899',
  networkRx: '#06b6d4',
  networkTx: '#10b981',
  diskRead: '#f97316',
  diskWrite: '#eab308',
};

export const HOST_HISTORY_RANGES = [
  { label: '1 Hour', value: '1h' },
  { label: '6 Hours', value: '6h' },
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' },
];
