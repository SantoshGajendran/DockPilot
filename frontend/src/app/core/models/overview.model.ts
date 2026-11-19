export interface HostMetrics {
  cpu_percent: number;
  memory_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  disk_percent: number;
  disk_used_bytes: number;
  disk_total_bytes: number;
  load_avg: number[];
  uptime_seconds: number;
}

export interface ContainerStateCounts {
  total: number;
  running: number;
  exited: number;
  restarting: number;
  unhealthy: number;
  paused: number;
}

export interface ContainerConsumerSummary {
  id: string;
  name: string;
  image: string;
  cpu_percent: number;
  memory_bytes: number;
  memory_percent: number;
  status: string;
}

export interface DockerEventSummary {
  id: string;
  action: string;
  actor_type: string;
  actor_name: string;
  timestamp: string;
}

export interface OverviewResponse {
  host: HostMetrics;
  containers: ContainerStateCounts;
  top_cpu: ContainerConsumerSummary[];
  top_memory: ContainerConsumerSummary[];
  recent_events: DockerEventSummary[];
  active_alerts_count: number;
  docker_connected: boolean;
  timestamp: string;
}
