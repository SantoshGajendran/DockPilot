export interface HostInfo {
  hostname: string;
  os_name: string;
  os_version: string;
  kernel_version: string;
  cpu_model: string;
  cpu_cores_physical: number;
  cpu_cores_logical: number;
  total_memory_bytes: number;
  docker_version: string;
  docker_storage_driver: string;
}

export interface HostCpuMetrics {
  overall_percent: number;
  cores_percent: number[];
}

export interface HostMemoryMetrics {
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  percent: number;
  swap_total_bytes: number;
  swap_used_bytes: number;
  swap_percent: number;
}

export interface HostMountMetrics {
  mountpoint: string;
  device: string;
  fstype: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  percent: number;
  inodes_total: number;
  inodes_used: number;
  inodes_free: number;
  inodes_percent: number;
}

export interface HostDiskIoMetrics {
  read_bytes_sec: number;
  write_bytes_sec: number;
  read_count_sec: number;
  write_count_sec: number;
}

export interface HostNetworkMetrics {
  interface_name: string;
  rx_bytes_sec: number;
  tx_bytes_sec: number;
  rx_packets_sec: number;
  tx_packets_sec: number;
  rx_errors: number;
  tx_errors: number;
}

export interface HostTemperatureItem {
  sensor_name: string;
  label: string;
  current_celsius: number;
  high_celsius?: number | null;
  critical_celsius?: number | null;
}

export interface HostProcessItem {
  pid: number;
  name: string;
  username: string;
  cpu_percent: number;
  memory_percent: number;
  memory_rss_bytes: number;
  status: string;
}

export interface HostLiveMetrics {
  timestamp: string;
  cpu: HostCpuMetrics;
  memory: HostMemoryMetrics;
  mounts: HostMountMetrics[];
  disk_io: HostDiskIoMetrics;
  network: HostNetworkMetrics[];
  load_1m: number;
  load_5m: number;
  load_15m: number;
  temperatures: HostTemperatureItem[];
  top_processes: HostProcessItem[];
}

export interface HostMetricPoint {
  timestamp: string;
  cpu_percent: number;
  memory_bytes: number;
  swap_bytes: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  load_1m: number;
}

export interface HostHistoryResponse {
  range: string;
  points: HostMetricPoint[];
}

export interface DockerDiskCategory {
  count: number;
  total_bytes: number;
  reclaimable_bytes: number;
  reclaimable_percent: number;
}

export interface DockerDiskUsage {
  images: DockerDiskCategory;
  containers: DockerDiskCategory;
  volumes: DockerDiskCategory;
  build_cache: DockerDiskCategory;
}
