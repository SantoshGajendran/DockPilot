export interface EnvVarItem {
  key: string;
  value: string;
  is_masked: boolean;
}

export interface MountItem {
  type: string;
  source: string;
  destination: string;
  mode: string;
  rw: boolean;
}

export interface NetworkItem {
  network_name: string;
  ip_address: string;
  gateway: string;
  mac_address: string;
}

export interface HealthcheckInfo {
  status: string;
  failing_streak: number;
  log: any[];
}

export interface ContainerDetail {
  id: string;
  name: string;
  image: string;
  command: string;
  created: string;
  state: string;
  status: string;
  health: string;
  restart_count: number;
  restart_policy: Record<string, any>;
  ports: Record<string, any>;
  mounts: MountItem[];
  networks: NetworkItem[];
  labels: Record<string, string>;
  env: EnvVarItem[];
  limits: Record<string, any>;
  healthcheck?: HealthcheckInfo | null;
}

export interface ContainerLiveStats {
  container_id: string;
  timestamp: string;
  cpu_percent: number;
  memory_bytes: number;
  memory_limit: number;
  memory_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  block_read_bytes: number;
  block_write_bytes: number;
}

export interface ContainerMetricsHistoryResponse {
  container_id: string;
  range: string;
  points: ContainerLiveStats[];
}

export interface EnvRevealResponse {
  env: EnvVarItem[];
}

export type DetailTabType = 'overview' | 'metrics' | 'logs' | 'config' | 'events';
