import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';

import { AuthService } from '../../core/services/auth.service';
import { ResourcesStore } from './resources.store';
import {
  RESOURCE_STATUS_CONFIG,
  RESOURCE_TABS,
  ResourceTabType,
  formatBytes,
} from '../../core/constants/resources.constants';
import { PruneWizardDialogComponent } from './dialogs/prune-wizard-dialog.component';
import { PullImageDialogComponent } from './dialogs/pull-image-dialog.component';
import { GlassPanelComponent } from '../../shared/components/glass-panel/glass-panel.component';

@Component({
  selector: 'dp-resources',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatBadgeModule,
    GlassPanelComponent,
  ],
  providers: [ResourcesStore],
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss'],
})
export class ResourcesComponent implements OnInit {
  readonly store = inject(ResourcesStore);
  readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly tabs = RESOURCE_TABS;
  readonly statusConfig = RESOURCE_STATUS_CONFIG;
  readonly formatBytes = formatBytes;

  readonly totalVolumeSize = computed(() => {
    return this.store.volumes().reduce((acc, v) => acc + (v.size || 0), 0);
  });

  readonly imageColumns: string[] = ['tags', 'shortId', 'size', 'created', 'status', 'actions'];
  readonly volumeColumns: string[] = ['name', 'driver', 'mountpoint', 'created', 'size', 'status', 'actions'];
  readonly networkColumns: string[] = ['name', 'driver', 'scope', 'internal', 'connected', 'status', 'actions'];

  get isOperator(): boolean {
    return this.authService.hasRole('operator');
  }

  ngOnInit(): void {
    this.store.init();
  }

  onTabChange(index: number): void {
    const selected = this.tabs[index];
    if (selected) {
      this.store.setActiveTab(selected.id);
    }
  }

  openPullDialog(): void {
    const ref = this.dialog.open(PullImageDialogComponent, {
      width: '600px',
      disableClose: true,
    });
    ref.afterClosed().subscribe((refreshed) => {
      if (refreshed) {
        this.store.loadImages();
        this.snackBar.open('Image pulled successfully', 'Close', { duration: 3000 });
      }
    });
  }

  openPruneWizard(): void {
    const ref = this.dialog.open(PruneWizardDialogComponent, {
      width: '560px',
      data: { resourceType: this.store.activeTab() },
    });
    ref.afterClosed().subscribe((refreshed) => {
      if (refreshed) {
        this.store.loadAll();
        this.snackBar.open('Prune completed successfully', 'Close', { duration: 3000 });
      }
    });
  }

  deleteImage(id: string, name: string): void {
    if (!confirm(`Are you sure you want to delete image "${name || id}"?`)) return;
    this.store.deleteImage(id, () => {
      this.snackBar.open(`Image "${name || id}" removed`, 'Close', { duration: 3000 });
    });
  }

  deleteVolume(name: string): void {
    if (!confirm(`Are you sure you want to delete volume "${name}"?`)) return;
    this.store.deleteVolume(name, () => {
      this.snackBar.open(`Volume "${name}" removed`, 'Close', { duration: 3000 });
    });
  }

  deleteNetwork(id: string, name: string): void {
    if (!confirm(`Are you sure you want to delete network "${name}"?`)) return;
    this.store.deleteNetwork(id, () => {
      this.snackBar.open(`Network "${name}" removed`, 'Close', { duration: 3000 });
    });
  }
}
