import { ChannelType } from '../models/notifications.model';

export interface ChannelTypeMeta {
  type: ChannelType;
  label: string;
  icon: string;
  secretLabel: string;
  secretRequired: boolean;
  description: string;
}

export const CHANNEL_TYPES: ChannelTypeMeta[] = [
  {
    type: 'slack',
    label: 'Slack Webhook',
    icon: 'tag',
    secretLabel: 'Slack Incoming Webhook URL',
    secretRequired: true,
    description: 'Post alert cards directly to a Slack channel via incoming webhook',
  },
  {
    type: 'telegram',
    label: 'Telegram Bot',
    icon: 'send',
    secretLabel: 'Telegram Bot Token',
    secretRequired: true,
    description: 'Send instant HTML alert messages to a Telegram group or channel',
  },
  {
    type: 'email',
    label: 'Email (SMTP)',
    icon: 'mail',
    secretLabel: 'SMTP Password',
    secretRequired: false,
    description: 'Deliver alert notifications to email distribution lists via SMTP',
  },
  {
    type: 'webhook',
    label: 'Generic Webhook',
    icon: 'webhook',
    secretLabel: 'HMAC Secret Token (Optional)',
    secretRequired: false,
    description: 'HTTP POST JSON payloads to custom incident endpoints or PagerDuty',
  },
];

export const NOTIFICATION_ENDPOINTS = {
  channels: '/api/v1/alerts/channels',
  routes: '/api/v1/alerts/routes',
  deliveryLog: '/api/v1/alerts/delivery-log',
};
