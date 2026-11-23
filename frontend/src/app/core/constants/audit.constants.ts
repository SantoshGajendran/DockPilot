export const AUDIT_ENDPOINTS = {
  audit: '/api/v1/audit',
  export: '/api/v1/audit/export',
};

export interface AuditResultMeta {
  result: string;
  label: string;
  icon: string;
  colorClass: string;
}

export const AUDIT_RESULTS_MAP: Record<string, AuditResultMeta> = {
  success: { result: 'success', label: 'Success', icon: 'check_circle', colorClass: 'audit-success' },
  failure: { result: 'failure', label: 'Failure', icon: 'error', colorClass: 'audit-failure' },
  pending: { result: 'pending', label: 'Pending', icon: 'schedule', colorClass: 'audit-pending' },
};

export const DEFAULT_AUDIT_RESULT_META: AuditResultMeta = {
  result: 'unknown',
  label: 'Unknown',
  icon: 'help_outline',
  colorClass: 'audit-unknown',
};

export function getAuditResultMeta(result: string): AuditResultMeta {
  const norm = (result || '').toLowerCase();
  return AUDIT_RESULTS_MAP[norm] || DEFAULT_AUDIT_RESULT_META;
}

export const AUDIT_ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Actions' },
  { value: 'container.start', label: 'Container Start' },
  { value: 'container.stop', label: 'Container Stop' },
  { value: 'container.restart', label: 'Container Restart' },
  { value: 'container.delete', label: 'Container Delete' },
  { value: 'compose.up', label: 'Compose Up' },
  { value: 'compose.down', label: 'Compose Down' },
  { value: 'compose.restart', label: 'Compose Restart' },
  { value: 'resource.prune', label: 'Resource Prune' },
  { value: 'image.pull', label: 'Image Pull' },
  { value: 'image.delete', label: 'Image Delete' },
  { value: 'volume.delete', label: 'Volume Delete' },
  { value: 'network.delete', label: 'Network Delete' },
  { value: 'terminal.session', label: 'Terminal Session' },
  { value: 'user.login', label: 'User Login' },
  { value: 'user.create', label: 'User Create' },
];

export const AUDIT_TARGET_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Target Types' },
  { value: 'container', label: 'Container' },
  { value: 'compose', label: 'Compose' },
  { value: 'image', label: 'Image' },
  { value: 'volume', label: 'Volume' },
  { value: 'network', label: 'Network' },
  { value: 'user', label: 'User' },
  { value: 'alert', label: 'Alert' },
  { value: 'notification', label: 'Notification' },
];

export const AUDIT_DATE_PRESET_OPTIONS: { value: string; label: string; hours?: number }[] = [
  { value: 'all', label: 'All Time' },
  { value: '1h', label: 'Past 1 Hour', hours: 1 },
  { value: '24h', label: 'Past 24 Hours', hours: 24 },
  { value: '7d', label: 'Past 7 Days', hours: 24 * 7 },
  { value: '30d', label: 'Past 30 Days', hours: 24 * 30 },
];
