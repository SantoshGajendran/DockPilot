export interface RuleTypeMeta {
  type: string;
  label: string;
  requiresThreshold: boolean;
  unit: string;
  icon: string;
  defaultThreshold?: number;
}

export const RULE_TYPES: RuleTypeMeta[] = [
  { type: 'container_down', label: 'Container Down', requiresThreshold: false, unit: '', icon: 'power_settings_new' },
  { type: 'restart_loop', label: 'Restart Loop Detected', requiresThreshold: false, unit: '', icon: 'restart_alt' },
  { type: 'health_failing', label: 'Health Check Failing', requiresThreshold: false, unit: '', icon: 'heart_broken' },
  { type: 'cpu_high', label: 'High Container CPU', requiresThreshold: true, unit: '%', icon: 'speed', defaultThreshold: 85.0 },
  { type: 'memory_high', label: 'High Container Memory', requiresThreshold: true, unit: '%', icon: 'memory', defaultThreshold: 90.0 },
  { type: 'disk_high', label: 'High Disk Utilization', requiresThreshold: true, unit: '%', icon: 'storage', defaultThreshold: 85.0 },
  { type: 'host_load', label: 'High Host System Load', requiresThreshold: true, unit: '', icon: 'dns', defaultThreshold: 4.0 },
  { type: 'container_missing', label: 'Container Missing', requiresThreshold: false, unit: '', icon: 'search_off' },
];

export const SEVERITIES: Array<{ value: 'critical' | 'warning' | 'info'; label: string; color: string; icon: string }> = [
  { value: 'critical', label: 'Critical', color: 'warn', icon: 'error' },
  { value: 'warning', label: 'Warning', color: 'accent', icon: 'warning' },
  { value: 'info', label: 'Info', color: 'primary', icon: 'info' },
];

export const SCOPE_TYPES: Array<{ value: 'all' | 'label' | 'container'; label: string; placeholder: string }> = [
  { value: 'all', label: 'All Containers', placeholder: '' },
  { value: 'label', label: 'Docker Label', placeholder: 'e.g. app=worker or env=production' },
  { value: 'container', label: 'Specific Container', placeholder: 'Container name or ID' },
];

export const ALERTS_ENDPOINTS = {
  rules: 'api/v1/alerts/rules',
  rulesTest: 'api/v1/alerts/rules/test',
  events: 'api/v1/alerts/events',
  silence: 'api/v1/alerts/silence',
  activeCount: 'api/v1/alerts/active-count',
};
