export interface LogEntry {
  container_id: string;
  container_name: string;
  stream: 'stdout' | 'stderr' | 'system';
  timestamp?: string | null;
  message: string;
  level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | null;
}

export interface LogSearchResponse {
  lines: LogEntry[];
  total: number;
  bytes_scanned: number;
  capped: boolean;
}

export interface LogFilterParams {
  container_ids?: string[];
  q?: string;
  regex?: boolean;
  since?: number;
  until?: number;
  tail?: number;
}

export interface AnsiSpan {
  text: string;
  classes: string[];
}
