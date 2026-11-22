import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { ResourceTabType, formatBytes } from '../../../core/constants/resources.constants';
import {
  PrunePreviewItem,
  PrunePreviewResponse,
  PruneResultResponse,
} from '../../../core/models/resources.model';
import { ResourcesService } from '../../../core/services/resources.service';

export interface PruneWizardDialogData {
  resourceType: ResourceTabType;
}

@Component({
  selector: 'dp-prune-wizard-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatChipsModule,
  ],
  templateUrl: './prune-wizard-dialog.component.html',
  styleUrls: ['./prune-wizard-dialog.component.scss'],
})
export class PruneWizardDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<PruneWizardDialogComponent>);
  readonly data: PruneWizardDialogData = inject(MAT_DIALOG_DATA);
  private readonly service = inject(ResourcesService);

  readonly step = signal<'preview' | 'confirm' | 'result'>('preview');
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly previewData = signal<PrunePreviewResponse | null>(null);
  readonly resultData = signal<PruneResultResponse | null>(null);
  readonly confirming = signal<boolean>(false);

  readonly formatBytes = formatBytes;

  get title(): string {
    switch (this.data.resourceType) {
      case 'images':
        return 'Prune Dangling Images';
      case 'volumes':
        return 'Prune Unused Volumes';
      case 'networks':
        return 'Prune Unused Networks';
    }
  }

  get targetNoun(): string {
    switch (this.data.resourceType) {
      case 'images':
        return 'dangling images';
      case 'volumes':
        return 'unused volumes';
      case 'networks':
        return 'unused networks';
    }
  }

  ngOnInit(): void {
    this.loadPreview();
  }

  loadPreview(): void {
    this.loading.set(true);
    this.error.set(null);

    const call =
      this.data.resourceType === 'images'
        ? this.service.previewPruneImages()
        : this.data.resourceType === 'volumes'
        ? this.service.previewPruneVolumes()
        : this.service.previewPruneNetworks();

    call.subscribe({
      next: (preview) => {
        this.previewData.set(preview);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.message || 'Failed to preview prune.');
        this.loading.set(false);
      },
    });
  }

  proceedToConfirm(): void {
    this.step.set('confirm');
  }

  backToPreview(): void {
    this.step.set('preview');
  }

  executePrune(): void {
    const preview = this.previewData();
    if (!preview || !preview.confirmation_token) return;

    this.confirming.set(true);
    this.error.set(null);

    const call =
      this.data.resourceType === 'images'
        ? this.service.confirmPruneImages(preview.confirmation_token)
        : this.data.resourceType === 'volumes'
        ? this.service.confirmPruneVolumes(preview.confirmation_token)
        : this.service.confirmPruneNetworks(preview.confirmation_token);

    call.subscribe({
      next: (res) => {
        this.resultData.set(res);
        this.confirming.set(false);
        this.step.set('result');
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.message || 'Prune operation failed.');
        this.confirming.set(false);
      },
    });
  }

  close(refreshed: boolean = false): void {
    this.dialogRef.close(refreshed);
  }
}
