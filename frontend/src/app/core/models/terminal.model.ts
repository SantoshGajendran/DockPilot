export interface TerminalResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

export interface TerminalStatus {
  enabled: boolean;
  idle_timeout_seconds: number;
  max_session_seconds: number;
  max_concurrent_sessions: number;
  active_sessions_count: number;
  record_sessions: boolean;
  allowed_shells: string[];
}

export interface TerminalSessionItem {
  id: string;
  container_id: string;
  container_name: string;
  username: string;
  shell: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  status: string;
  bytes_sent: number;
  bytes_received: number;
  ip_address?: string | null;
  transcript?: string | null;
}

export interface TerminalSessionsListResponse {
  sessions: TerminalSessionItem[];
  total_count: number;
}

export type TerminalConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
