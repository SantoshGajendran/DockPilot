export interface AlertRule {
  id: number;
  name: string;
  description?: string | null;
  rule_type: string;
  scope_type: 'all' | 'label' | 'container';
  scope_value?: string | null;
  severity: 'critical' | 'warning' | 'info';
  threshold?: number | null;
  duration_minutes: number;
  cooldown_minutes: number;
  enabled: boolean;
  is_silenced?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleCreate {
  name: string;
  description?: string | null;
  rule_type: string;
  scope_type: 'all' | 'label' | 'container';
  scope_value?: string | null;
  severity: 'critical' | 'warning' | 'info';
  threshold?: number | null;
  duration_minutes?: number;
  cooldown_minutes?: number;
  enabled?: boolean;
}

export interface AlertRuleUpdate {
  name?: string;
  description?: string | null;
  rule_type?: string;
  scope_type?: 'all' | 'label' | 'container';
  scope_value?: string | null;
  severity?: 'critical' | 'warning' | 'info';
  threshold?: number | null;
  duration_minutes?: number;
  cooldown_minutes?: number;
  enabled?: boolean;
}

export interface AlertRulesListResponse {
  rules: AlertRule[];
  total: number;
}

export interface AlertEvent {
  id: number;
  rule_id: number;
  rule_name: string;
  rule_type: string;
  severity: 'critical' | 'warning' | 'info';
  target_type: string;
  target_id?: string | null;
  target_name?: string | null;
  status: 'firing' | 'resolved';
  message: string;
  value?: number | null;
  threshold?: number | null;
  started_at: string;
  resolved_at?: string | null;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  created_at: string;
}

export interface AlertEventsListResponse {
  events: AlertEvent[];
  total: number;
}

export interface AlertTargetMatch {
  target_id?: string | null;
  target_name?: string | null;
  would_fire: boolean;
  current_value?: number | null;
  threshold?: number | null;
  message: string;
}

export interface AlertDryRunRequest {
  rule_type: string;
  scope_type: 'all' | 'label' | 'container';
  scope_value?: string | null;
  threshold?: number | null;
  duration_minutes?: number;
}

export interface AlertDryRunResponse {
  rule_type: string;
  matches_count: number;
  targets: AlertTargetMatch[];
}

export interface AlertSilenceCreate {
  rule_id?: number | null;
  container_id?: string | null;
  duration_minutes: number;
  reason?: string | null;
}

export interface AlertSilenceResponse {
  id: number;
  rule_id?: number | null;
  container_id?: string | null;
  silenced_until: string;
  reason?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface ActiveAlertsCountResponse {
  active_count: number;
}
