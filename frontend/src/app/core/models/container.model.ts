export interface ContainerSummary {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  health: string;
  restart_count: number;
  created: string;
  ports: Record<string, any>;
  labels: Record<string, string>;
  compose_project?: string | null;
}

export interface ContainerLiveMetrics {
  container_id: string;
  name: string;
  cpu_percent: number;
  memory_bytes: number;
  memory_limit: number;
  memory_percent: number;
  state: string;
  health: string;
}

export interface ContainersListResponse {
  items: ContainerSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BulkActionRequest {
  action: string;
  container_ids: string[];
}

export interface BulkActionResultItem {
  container_id: string;
  action: string;
  success: boolean;
  message?: string | null;
}

export interface BulkActionResponse {
  results: BulkActionResultItem[];
  total_success: number;
  total_failed: number;
}

export interface DeleteTokenResponse {
  token: string;
  container_id: string;
  expires_at: string;
}

export interface ContainerFilterParams {
  q?: string;
  state?: string;
  health?: string;
  compose_project?: string;
  label?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}
