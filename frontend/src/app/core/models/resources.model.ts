export interface ResourceInUseRef {
  id: string;
  name: string;
  state: string;
}

export interface ImageItem {
  id: string;
  short_id: string;
  tags: string[];
  size: number;
  created: string;
  labels: Record<string, string>;
  is_dangling: boolean;
  is_in_use: boolean;
  in_use_by: ResourceInUseRef[];
  is_protected: boolean;
}

export interface ImagesListResponse {
  images: ImageItem[];
  total_size: number;
  total_count: number;
}

export interface VolumeItem {
  name: string;
  driver: string;
  mountpoint: string;
  created: string;
  labels: Record<string, string>;
  size: number | null;
  is_in_use: boolean;
  in_use_by: ResourceInUseRef[];
  is_protected: boolean;
}

export interface VolumesListResponse {
  volumes: VolumeItem[];
  total_count: number;
}

export interface NetworkItem {
  id: string;
  short_id: string;
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
  created: string;
  labels: Record<string, string>;
  connected_container_ids: string[];
  is_in_use: boolean;
  in_use_by: ResourceInUseRef[];
  is_built_in: boolean;
  is_protected: boolean;
}

export interface NetworksListResponse {
  networks: NetworkItem[];
  total_count: number;
}

export interface PrunePreviewItem {
  id: string;
  name: string;
  size: number;
  details?: string | null;
}

export interface PrunePreviewResponse {
  resource_type: 'images' | 'volumes' | 'networks';
  items_count: number;
  space_reclaimed_bytes: number;
  items: PrunePreviewItem[];
  confirmation_token: string;
  expires_at: string;
}

export interface PruneConfirmRequest {
  confirmation_token: string;
}

export interface PruneResultResponse {
  resource_type: string;
  items_deleted: string[];
  space_reclaimed_bytes: number;
}

export interface PullImageRequest {
  image_name: string;
}

export interface JobStreamEvent {
  job_id: string;
  status: string;
  line?: string | null;
  exit_code?: number | null;
}
