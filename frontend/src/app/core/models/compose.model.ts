export type ComposeProjectStatus =
  | 'running'
  | 'partially_running'
  | 'stopped'
  | 'unhealthy'
  | 'empty';

export type ComposeAction = 'up' | 'down' | 'restart' | 'pull' | 'stop' | 'start';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ComposeServiceItem {
  service_name: string;
  container_id: string;
  container_name: string;
  state: string;
  status: string;
  health: string;
  image: string;
}

export interface ComposeAuditSummary {
  action: string;
  status: string;
  timestamp: string;
  username?: string | null;
}

export interface ComposeProject {
  name: string;
  status: ComposeProjectStatus;
  containers_count: number;
  running_count: number;
  config_files: string[];
  working_dir?: string | null;
  services: ComposeServiceItem[];
  last_action?: ComposeAuditSummary | null;
}

export interface ComposeProjectsListResponse {
  projects: ComposeProject[];
  total: number;
}

export interface ComposeActionResponse {
  job_id: string;
  project_name: string;
  action: string;
  status: string;
}

export interface ComposeJob {
  id: string;
  project_name: string;
  action: string;
  status: JobStatus;
  exit_code?: number | null;
  created_at: string;
  finished_at?: string | null;
  logs: string[];
  error?: string | null;
}

export interface JobStreamEvent {
  job_id: string;
  line?: string | null;
  status: JobStatus;
  exit_code?: number | null;
}
