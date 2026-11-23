export const SETTINGS_ENDPOINTS = {
  settings: 'api/v1/settings',
  storage: 'api/v1/settings/storage',
  retentionRun: 'api/v1/settings/retention/run',
};

export interface SettingsSection {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'telemetry',
    label: 'Telemetry & Collection',
    icon: 'speed',
    description: 'Configure polling frequencies and stats stream intervals',
  },
  {
    id: 'retention',
    label: 'Retention Policies',
    icon: 'auto_delete',
    description: 'Configure data lifecycle periods, rollups, and auto-purge limits',
  },
  {
    id: 'security',
    label: 'Security & Masking',
    icon: 'security',
    description: 'Redaction patterns for environment secrets and login lockout policies',
  },
  {
    id: 'alerts',
    label: 'Alerting Defaults',
    icon: 'notifications_active',
    description: 'Rule evaluation frequency and notification cooldown timings',
  },
  {
    id: 'features',
    label: 'Feature Flags',
    icon: 'toggle_on',
    description: 'Enable or disable major subsystems at runtime',
  },
  {
    id: 'storage',
    label: 'Storage & Retention',
    icon: 'storage',
    description: 'Inspect database disk footprints and trigger manual retention purge',
  },
];
