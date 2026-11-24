import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ComposeStore } from './compose.store';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { COMPOSE_ACTIONS, COMPOSE_STATUS_COLORS } from '../../core/constants/compose.constants';
import { ComposeAction, ComposeProject, ComposeServiceItem } from '../../core/models/compose.model';
import { JobOutputDialogComponent } from './dialogs/job-output-dialog.component';
import { GlassPanelComponent } from '../../shared/components/glass-panel/glass-panel.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'dp-compose-projects',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    GlassPanelComponent,
    IconComponent,
  ],
  providers: [ComposeStore],
  templateUrl: './compose-projects.component.html',
  styleUrls: ['./compose-projects.component.scss'],
})
export class ComposeProjectsComponent implements OnInit {
  readonly store = inject(ComposeStore);
  readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);

  readonly actions = COMPOSE_ACTIONS;
  readonly statusColors = COMPOSE_STATUS_COLORS;

  // View mode toggle per project: 'table' | 'topology'
  readonly projectViewModes = signal<Record<string, 'table' | 'topology'>>({});

  ngOnInit(): void {
    this.store.loadProjects();
  }

  isOperatorOrAdmin(): boolean {
    const role = this.authService.userRole();
    return role === 'operator' || role === 'admin';
  }

  getViewMode(projectName: string): 'table' | 'topology' {
    return this.projectViewModes()[projectName] || 'table';
  }

  setViewMode(projectName: string, mode: 'table' | 'topology'): void {
    this.projectViewModes.update((prev) => ({
      ...prev,
      [projectName]: mode,
    }));
  }

  getServiceStateColor(state: string): string {
    const s = state?.toLowerCase() || '';
    if (s === 'running') return '#34D399';
    if (s === 'restarting' || s === 'paused') return '#F59E0B';
    if (s === 'exited' || s === 'dead') return '#F43F5E';
    return '#64748B';
  }

  copyPath(path: string): void {
    navigator.clipboard.writeText(path).then(() => {
      this.toast.info('Path copied to clipboard');
    });
  }

  triggerAction(project: ComposeProject, action: ComposeAction): void {
    if (!this.isOperatorOrAdmin()) {
      this.toast.error('Operator or admin role required for compose actions');
      return;
    }

    this.store.executeAction(project.name, action).subscribe({
      next: (resp) => {
        this.dialog.open(JobOutputDialogComponent, {
          width: '740px',
          disableClose: false,
          data: {
            jobId: resp.job_id,
            projectName: project.name,
            action,
          },
        });
      },
      error: (err) => {
        this.toast.error(err?.error?.detail || err?.message || 'Failed to trigger compose action');
      },
    });
  }

  onDownProject(projectName: string): void {
    if (confirm(`Tear down all containers, networks, and services for project '${projectName}'?`)) {
      this.store.downProject(projectName);
    }
  }
}
