import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ComposeStore } from './compose.store';
import { ComposeService } from '../../core/services/compose.service';
import { ComposeActionResponse, ComposeProjectsListResponse } from '../../core/models/compose.model';

describe('ComposeStore', () => {
  let store: ComposeStore;
  let composeServiceMock: {
    getProjects: jest.Mock;
    executeAction: jest.Mock;
  };

  const mockProjectsResp: ComposeProjectsListResponse = {
    projects: [
      {
        name: 'dockpilot',
        status: 'running',
        containers_count: 2,
        running_count: 2,
        config_files: ['docker-compose.yml'],
        working_dir: '.',
        services: [
          {
            service_name: 'redis',
            container_id: 'c1',
            container_name: 'dockpilot-redis',
            state: 'running',
            status: 'Up',
            health: 'healthy',
            image: 'redis:alpine',
          },
        ],
      },
    ],
    total: 1,
  };

  beforeEach(() => {
    composeServiceMock = {
      getProjects: jest.fn().mockReturnValue(of(mockProjectsResp)),
      executeAction: jest.fn().mockReturnValue(
        of({ job_id: 'job-1', project_name: 'dockpilot', action: 'up', status: 'running' } as ComposeActionResponse)
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        ComposeStore,
        { provide: ComposeService, useValue: composeServiceMock },
      ],
    });

    store = TestBed.inject(ComposeStore);
  });

  it('should load projects successfully', () => {
    store.loadProjects();
    expect(store.isLoading()).toBe(false);
    expect(store.projects().length).toBe(1);
    expect(store.projects()[0].name).toBe('dockpilot');
  });

  it('should handle load projects error', () => {
    composeServiceMock.getProjects.mockReturnValue(throwError(() => new Error('Server error')));
    store.loadProjects();
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toContain('Server error');
  });

  it('should toggle expansion state for projects', () => {
    expect(store.isExpanded('dockpilot')).toBe(false);
    store.toggleExpand('dockpilot');
    expect(store.isExpanded('dockpilot')).toBe(true);
    store.toggleExpand('dockpilot');
    expect(store.isExpanded('dockpilot')).toBe(false);
  });

  it('should execute action and reload projects', () => {
    store.executeAction('dockpilot', 'restart').subscribe((res) => {
      expect(res.job_id).toBe('job-1');
    });
    expect(composeServiceMock.executeAction).toHaveBeenCalledWith('dockpilot', 'restart');
    expect(composeServiceMock.getProjects).toHaveBeenCalled();
  });
});
