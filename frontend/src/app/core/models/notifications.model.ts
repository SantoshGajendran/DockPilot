export type ChannelType = 'email' | 'telegram' | 'webhook' | 'slack';

export interface NotificationChannel {
  id: number;
  name: string;
  channel_type: ChannelType;
  enabled: boolean;
  config: Record<string, any>;
  has_secret: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationChannelCreate {
  name: string;
  channel_type: ChannelType;
  enabled?: boolean;
  config: Record<string, any>;
  secret?: string | null;
}

export interface NotificationChannelUpdate {
  name?: string;
  enabled?: boolean;
  config?: Record<string, any>;
  secret?: string | null;
}

export interface NotificationChannelsListResponse {
  channels: NotificationChannel[];
  total: number;
}

export interface NotificationRoute {
  id: number;
  channel_id: number;
  channel_name?: string | null;
  name: string;
  min_severity: 'info' | 'warning' | 'critical';
  rule_type?: string | null;
  scope_type: 'all' | 'label' | 'container';
  scope_value?: string | null;
  enabled: boolean;
  created_at: string;
}

export interface NotificationRouteCreate {
  channel_id: number;
  name: string;
  min_severity?: 'info' | 'warning' | 'critical';
  rule_type?: string | null;
  scope_type?: 'all' | 'label' | 'container';
  scope_value?: string | null;
  enabled?: boolean;
}

export interface NotificationRouteUpdate {
  channel_id?: number;
  name?: string;
  min_severity?: 'info' | 'warning' | 'critical';
  rule_type?: string | null;
  scope_type?: 'all' | 'label' | 'container';
  scope_value?: string | null;
  enabled?: boolean;
}

export interface NotificationRoutesListResponse {
  routes: NotificationRoute[];
  total: number;
}

export interface NotificationDeliveryLog {
  id: number;
  channel_id?: number | null;
  channel_name: string;
  channel_type: string;
  event_id?: number | null;
  alert_title: string;
  severity: string;
  status: 'delivered' | 'failed' | 'testing';
  attempts: number;
  error_message?: string | null;
  payload_preview?: string | null;
  created_at: string;
}

export interface DeliveryLogListResponse {
  logs: NotificationDeliveryLog[];
  total: number;
}

export interface NotificationTestResult {
  success: boolean;
  message: string;
  attempts: number;
}
