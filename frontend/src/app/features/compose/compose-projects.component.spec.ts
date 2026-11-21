import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { signal } from '@angular/core';

import { ComposeProjectsComponent } from './compose-projects.component';
import { ComposeStore } from './compose.store';
import { ComposeService } from '../../core/services/compose.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ComposeProject, ComposeProjectsListResponse } from '../../core/models/compose.model';
import { JobOutputDialogComponent } from './dialogs/job-output-dialog.component';

describe('ComposeProjectsComponent', () => {
  let component: ComposeProjectsComponent;
  let fixture: ComponentFixture<ComposeProjectsComponent>;
  let composeServiceMock: {
    getProjects: jest.Mock;
    executeAction: jest.Mock;
  };
  let authServiceMock: {
    userRole: jest.Mock;
  };
  let dialogMock: {
    open: jest.Mock;
  };
  let toastMock: {
    info: jest.Mock;
    error: jest.Mock;
  };

  const mockProjects: ComposeProject[] = [
    {
      name: 'dockpilot-stack',
      status: 'running',
      containers_count: 2,
      running_count: 2,
      config_files: ['/opt/dockpilot/docker-compose.yml'],
      working_dir: '/opt/dockpilot',
      services: [
        {
          service_name: 'backend',
          container_name: 'dockpilot-stack_backend_1',
          image: 'dockpilot-backend:latest',
          state: 'running',
          health: 'healthy',
        },
        {
          service_name: 'frontend',
          container_name: 'dockpilot-stack_frontend_1',
          image: 'dockpilot-frontend:latest',
          state: 'running',
          health: 'none',
        },
      ],
      last_action: {
        action: 'up',
        status: 'success',
        username: 'admin',
        timestamp: '2026-11-21T12:00:00Z',
      },
    },
  ];

  const mockResponse: ComposeProjectsListResponse = {
    projects: mockProjects,
    total: 1,
  };

  beforeEach(async () => {
    composeServiceMock = {
      getProjects: jest.fn().mockReturnValue(of(mockResponse)),
      executeAction: jest.fn().mockReturnValue(of({ job_id: 'job-123', status: 'pending' })),
    };

    authServiceMock = {
      userRole: jest.fn().mockReturnValue('admin'),
    };

    dialogMock = {
      open: jest.fn(),
    };

    toastMock = {
      info: jest.fn(),
      error: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ComposeProjectsComponent, NoopAnimationsModule],
      providers: [
        { provide: ComposeService, useValue: composeServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: ToastService, useValue: toastMock },
      ],
    })
    .overrideComponent(ComposeProjectsComponent, {
      set: {
        providers: [
          ComposeStore,
          { provide: MatDialog, useValue: dialogMock },
        ],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComposeProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load projects on init', () => {
    expect(component).toBeTruthy();
    expect(composeServiceMock.getProjects).toHaveBeenCalled();
    expect(component.store.projects().length).toBe(1);
    expect(component.store.projects()[0].name).toBe('dockpilot-stack');
  });

  it('should display empty state when no projects are returned', () => {
    composeServiceMock.getProjects.mockReturnValue(of({ projects: [], total: 0 }));
    component.store.loadProjects();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state')).toBeTruthy();
    expect(compiled.textContent).toContain('No Compose Projects Found');
  });

  it('should display project details and service counts', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.project-title-area h3')?.textContent).toContain('dockpilot-stack');
    expect(compiled.querySelector('.status-badge')?.textContent).toContain('RUNNING');
    expect(compiled.querySelector('.service-count-chip')?.textContent).toContain('2/2 Running');
  });

  it('should toggle services table expansion', () => {
    expect(component.store.isExpanded('dockpilot-stack')).toBe(false);

    component.store.toggleExpand('dockpilot-stack');
    fixture.detectChanges();
    expect(component.store.isExpanded('dockpilot-stack')).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector('.services-table');
    expect(table).toBeTruthy();
    expect(table?.textContent).toContain('backend');
    expect(table?.textContent).toContain('frontend');
  });

  it('should copy path to clipboard', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    component.copyPath('/opt/dockpilot/docker-compose.yml');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/opt/dockpilot/docker-compose.yml');
  });

  it('should trigger compose action and open JobOutputDialog for admin/operator', () => {
    component.triggerAction(mockProjects[0], 'restart');
    expect(composeServiceMock.executeAction).toHaveBeenCalledWith('dockpilot-stack', 'restart');
    expect(dialogMock.open).toHaveBeenCalledWith(JobOutputDialogComponent, expect.objectContaining({
      width: '740px',
      data: {
        jobId: 'job-123',
        projectName: 'dockpilot-stack',
        action: 'restart',
      },
    }));
  });

  it('should prevent compose action and show error toast for viewer role', () => {
    authServiceMock.userRole.mockReturnValue('viewer');
    component.triggerAction(mockProjects[0], 'restart');
    expect(composeServiceMock.executeAction).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith('Operator or admin role required for compose actions');
  });
});
