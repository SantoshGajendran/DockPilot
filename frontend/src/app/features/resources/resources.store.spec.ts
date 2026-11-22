import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ResourcesStore } from './resources.store';
import { ResourcesService } from '../../core/services/resources.service';
import {
  ImagesListResponse,
  NetworksListResponse,
  VolumesListResponse,
} from '../../core/models/resources.model';

describe('ResourcesStore', () => {
  let store: ResourcesStore;
  let serviceMock: jest.Mocked<Partial<ResourcesService>>;

  const mockImagesResp: ImagesListResponse = {
    images: [
      {
        id: 'sha256:redis123',
        short_id: 'redis123',
        tags: ['redis:7-alpine'],
        size: 38000000,
        created: '2026-11-20',
        labels: {},
        is_dangling: false,
        is_in_use: true,
        in_use_by: [{ id: 'c1', name: 'dockpilot-redis', state: 'running' }],
        is_protected: true,
      },
      {
        id: 'sha256:node123',
        short_id: 'node123',
        tags: ['node:20-alpine'],
        size: 180000000,
        created: '2026-11-10',
        labels: {},
        is_dangling: false,
        is_in_use: false,
        in_use_by: [],
        is_protected: false,
      },
    ],
    total_size: 218000000,
    total_count: 2,
  };

  const mockVolumesResp: VolumesListResponse = {
    volumes: [
      {
        name: 'dockpilot_redis_data',
        driver: 'local',
        mountpoint: '/path',
        created: '2026-11-20',
        labels: {},
        size: 12000000,
        is_in_use: true,
        in_use_by: [{ id: 'c1', name: 'dockpilot-redis', state: 'running' }],
        is_protected: true,
      },
      {
        name: 'legacy_backup',
        driver: 'local',
        mountpoint: '/path',
        created: '2026-11-01',
        labels: {},
        size: 48000000,
        is_in_use: false,
        in_use_by: [],
        is_protected: false,
      },
    ],
    total_count: 2,
  };

  const mockNetworksResp: NetworksListResponse = {
    networks: [
      {
        id: 'net_bridge',
        short_id: 'bridge',
        name: 'bridge',
        driver: 'bridge',
        scope: 'local',
        internal: false,
        created: '2026-11-01',
        labels: {},
        connected_container_ids: [],
        is_in_use: false,
        in_use_by: [],
        is_built_in: true,
        is_protected: true,
      },
      {
        id: 'net_test',
        short_id: 'test',
        name: 'unused_test_net',
        driver: 'bridge',
        scope: 'local',
        internal: false,
        created: '2026-11-15',
        labels: {},
        connected_container_ids: [],
        is_in_use: false,
        in_use_by: [],
        is_built_in: false,
        is_protected: false,
      },
    ],
    total_count: 2,
  };

  beforeEach(() => {
    serviceMock = {
      getImages: jest.fn().mockReturnValue(of(mockImagesResp)),
      getVolumes: jest.fn().mockReturnValue(of(mockVolumesResp)),
      getNetworks: jest.fn().mockReturnValue(of(mockNetworksResp)),
      removeImage: jest.fn().mockReturnValue(of({ ok: true, message: 'Deleted' })),
      removeVolume: jest.fn().mockReturnValue(of({ ok: true, message: 'Deleted' })),
      removeNetwork: jest.fn().mockReturnValue(of({ ok: true, message: 'Deleted' })),
    };

    TestBed.configureTestingModule({
      providers: [
        ResourcesStore,
        { provide: ResourcesService, useValue: serviceMock },
      ],
    });

    store = TestBed.inject(ResourcesStore);
  });

  it('should initialize and load all resources', () => {
    store.init();
    expect(store.images().length).toBe(2);
    expect(store.volumes().length).toBe(2);
    expect(store.networks().length).toBe(2);
    expect(store.totalImageSize()).toBe(218000000);
  });

  it('should compute unused resources count correctly', () => {
    store.init();
    expect(store.unusedImagesCount()).toBe(1); // node:20-alpine
    expect(store.unusedVolumesCount()).toBe(1); // legacy_backup
    expect(store.unusedNetworksCount()).toBe(1); // unused_test_net (bridge is built-in & protected)
  });

  it('should filter resources by search query', () => {
    store.init();
    store.setSearchQuery('redis');

    expect(store.filteredImages().length).toBe(1);
    expect(store.filteredImages()[0].tags[0]).toBe('redis:7-alpine');

    expect(store.filteredVolumes().length).toBe(1);
    expect(store.filteredVolumes()[0].name).toBe('dockpilot_redis_data');

    expect(store.filteredNetworks().length).toBe(0);
  });

  it('should delete image and update local list', () => {
    store.init();
    const onSuccess = jest.fn();

    store.deleteImage('sha256:node123', onSuccess);

    expect(serviceMock.removeImage).toHaveBeenCalledWith('sha256:node123');
    expect(store.images().length).toBe(1);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should delete volume and update local list', () => {
    store.init();
    store.deleteVolume('legacy_backup');

    expect(serviceMock.removeVolume).toHaveBeenCalledWith('legacy_backup');
    expect(store.volumes().length).toBe(1);
  });

  it('should delete network and update local list', () => {
    store.init();
    store.deleteNetwork('net_test');

    expect(serviceMock.removeNetwork).toHaveBeenCalledWith('net_test');
    expect(store.networks().length).toBe(1);
  });

  it('should handle deletion error', () => {
    serviceMock.removeImage = jest.fn().mockReturnValue(
      throwError(() => ({ error: { detail: 'Image is protected' } }))
    );

    store.deleteImage('sha256:redis123');

    expect(store.actionError()).toBe('Image is protected');
    expect(store.actionInProgress()).toBe(false);
  });
});
