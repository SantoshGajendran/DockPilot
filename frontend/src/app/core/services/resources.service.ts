import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ImagesListResponse,
  JobStreamEvent,
  NetworksListResponse,
  PruneConfirmRequest,
  PrunePreviewResponse,
  PruneResultResponse,
  PullImageRequest,
  VolumesListResponse,
} from '../models/resources.model';
import { SseService } from './sse.service';

export const RESOURCES_ENDPOINTS = {
  images: '/api/v1/resources/images',
  removeImage: (id: string) => `/api/v1/resources/images/${encodeURIComponent(id)}`,
  pullImage: '/api/v1/resources/images/pull',
  pruneImagesPreview: '/api/v1/resources/images/prune/preview',
  pruneImagesConfirm: '/api/v1/resources/images/prune',

  volumes: '/api/v1/resources/volumes',
  removeVolume: (name: string) => `/api/v1/resources/volumes/${encodeURIComponent(name)}`,
  pruneVolumesPreview: '/api/v1/resources/volumes/prune/preview',
  pruneVolumesConfirm: '/api/v1/resources/volumes/prune',

  networks: '/api/v1/resources/networks',
  removeNetwork: (id: string) => `/api/v1/resources/networks/${encodeURIComponent(id)}`,
  pruneNetworksPreview: '/api/v1/resources/networks/prune/preview',
  pruneNetworksConfirm: '/api/v1/resources/networks/prune',

  jobStream: (id: string) => `/api/v1/jobs/${id}/stream`,
};

@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private readonly http = inject(HttpClient);
  private readonly sseService = inject(SseService);

  // Images
  getImages(): Observable<ImagesListResponse> {
    return this.http.get<ImagesListResponse>(RESOURCES_ENDPOINTS.images);
  }

  removeImage(id: string): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(RESOURCES_ENDPOINTS.removeImage(id));
  }

  pullImage(imageName: string): Observable<any> {
    return this.http.post<any>(RESOURCES_ENDPOINTS.pullImage, { image_name: imageName } as PullImageRequest);
  }

  previewPruneImages(): Observable<PrunePreviewResponse> {
    return this.http.post<PrunePreviewResponse>(RESOURCES_ENDPOINTS.pruneImagesPreview, {});
  }

  confirmPruneImages(token: string): Observable<PruneResultResponse> {
    return this.http.post<PruneResultResponse>(RESOURCES_ENDPOINTS.pruneImagesConfirm, { confirmation_token: token } as PruneConfirmRequest);
  }

  // Volumes
  getVolumes(): Observable<VolumesListResponse> {
    return this.http.get<VolumesListResponse>(RESOURCES_ENDPOINTS.volumes);
  }

  removeVolume(name: string): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(RESOURCES_ENDPOINTS.removeVolume(name));
  }

  previewPruneVolumes(): Observable<PrunePreviewResponse> {
    return this.http.post<PrunePreviewResponse>(RESOURCES_ENDPOINTS.pruneVolumesPreview, {});
  }

  confirmPruneVolumes(token: string): Observable<PruneResultResponse> {
    return this.http.post<PruneResultResponse>(RESOURCES_ENDPOINTS.pruneVolumesConfirm, { confirmation_token: token } as PruneConfirmRequest);
  }

  // Networks
  getNetworks(): Observable<NetworksListResponse> {
    return this.http.get<NetworksListResponse>(RESOURCES_ENDPOINTS.networks);
  }

  removeNetwork(id: string): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(RESOURCES_ENDPOINTS.removeNetwork(id));
  }

  previewPruneNetworks(): Observable<PrunePreviewResponse> {
    return this.http.post<PrunePreviewResponse>(RESOURCES_ENDPOINTS.pruneNetworksPreview, {});
  }

  confirmPruneNetworks(token: string): Observable<PruneResultResponse> {
    return this.http.post<PruneResultResponse>(RESOURCES_ENDPOINTS.pruneNetworksConfirm, { confirmation_token: token } as PruneConfirmRequest);
  }

  // Live Job Stream
  streamJob(id: string): Observable<JobStreamEvent> {
    return this.sseService.connect<JobStreamEvent>(RESOURCES_ENDPOINTS.jobStream(id));
  }
}
