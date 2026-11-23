import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';

import { ContainersStore } from './containers.store';
import { AuthService } from '../../core/services/auth.service';
import { ActionConfirmDialogComponent } from './dialogs/action-confirm-dialog.component';
import { DeleteContainerDialogComponent } from './dialogs/delete-container-dialog.component';
import {
  CONTAINER_HEALTH_COLORS,
  CONTAINER_STATE_COLORS,
} from '../../core/constants/container.constants';
import { ContainerSummary } from '../../core/models/container.model';
import { StatusDotComponent } from '../../shared/components/status-dot/status-dot.component';
import { SparklineComponent } from '../../shared/components/sparkline/sparkline.component';
import { GlassPanelComponent } from '../../shared/components/glass-panel/glass-panel.component';
import { SkeletonShimmerComponent } from '../../shared/components/skeleton-shimmer/skeleton-shimmer.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { MagneticHoverDirective } from '../../shared/directives/magnetic-hover.directive';

@Component({
  selector: 'dp-containers-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatDialogModule,
    MatDividerModule,
    StatusDotComponent,
    SparklineComponent,
    GlassPanelComponent,
    SkeletonShimmerComponent,
    EmptyStateComponent,
    IconComponent,
    MagneticHoverDirective
  ],
  templateUrl: './containers-list.component.html',
  styleUrls: ['./containers-list.component.scss'],
})
export class ContainersListComponent implements OnInit, OnDestroy {
  readonly store = inject(ContainersStore);
  readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly stateColors = CONTAINER_STATE_COLORS;
  readonly healthColors = CONTAINER_HEALTH_COLORS;

  readonly displayedColumns: string[] = [
    'select',
    'state',
    'name',
    'project',
    'ports',
    'cpu',
    'memory',
    'status',
    'restarts',
    'actions',
  ];

  newPresetName = '';

  ngOnInit(): void {
    this.store.loadContainers();
    this.store.initStream();
  }

  ngOnDestroy(): void {
    this.store.destroyStream();
  }

  getSparklineData(containerId: string, metricType: 'cpu' | 'memory'): number[] {
    const m = this.store.liveMetrics().get(containerId);
    const baseVal = metricType === 'cpu' ? (m?.cpu_percent ?? 8) : (m?.memory_percent ?? 20);
    return [
      Math.max(0, baseVal * 0.7),
      Math.max(0, baseVal * 0.85),
      Math.max(0, baseVal * 0.75),
      Math.max(0, baseVal * 1.1),
      Math.max(0, baseVal * 0.9),
      Math.max(0, baseVal * 1.05),
      Math.max(0, baseVal * 0.95),
      baseVal
    ];
  }

  formatPorts(ports: Record<string, any>): string {
    if (!ports || Object.keys(ports).length === 0) return '-';
    const parts: string[] = [];
    for (const [containerPort, hostBindings] of Object.entries(ports)) {
      if (Array.isArray(hostBindings) && hostBindings.length > 0) {
        const hostPort = hostBindings[0].HostPort;
        parts.push(`${hostPort}->${containerPort}`);
      } else {
        parts.push(containerPort);
      }
    }
    return parts.join(', ');
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  onActionClick(container: ContainerSummary, action: string): void {
    if (action === 'stop' || action === 'kill') {
      const ref = this.dialog.open(ActionConfirmDialogComponent, {
        data: { action, containerName: container.name },
      });
      ref.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.store.optimisticAction(container.id, action);
        }
      });
    } else {
      this.store.optimisticAction(container.id, action);
    }
  }

  onDeleteClick(container: ContainerSummary): void {
    const ref = this.dialog.open(DeleteContainerDialogComponent, {
      data: { containerId: container.id, containerName: container.name },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.deleteContainer(container.id, container.name);
      }
    });
  }

  onSavePresetSubmit(): void {
    if (this.newPresetName.trim()) {
      this.store.savePreset(this.newPresetName.trim());
      this.newPresetName = '';
    }
  }
}
