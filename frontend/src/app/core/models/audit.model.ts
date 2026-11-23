export interface AuditLog {
  id: string;
  timestamp: string;
  user_id?: string | null;
  username: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  payload?: Record<string, any> | null;
  result: 'success' | 'failure' | 'pending' | string;
  error_message?: string | null;
  ip_address?: string | null;
}

export interface AuditLogsListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditFilterParams {
  user?: string;
  action?: string;
  target_type?: string;
  target_id?: string;
  result?: string;
  since?: string;
  until?: string;
  page?: number;
  page_size?: number;
  sort_order?: 'asc' | 'desc';
}
