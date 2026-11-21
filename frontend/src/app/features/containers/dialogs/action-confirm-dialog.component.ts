import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ActionDialogData {
  action: string;
  containerName: string;
}

@Component({
  selector: 'dp-action-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon color="warn">warning</mat-icon>
      Confirm Action: {{ data.action | uppercase }}
    </h2>
    <mat-dialog-content>
      <p>Are you sure you want to <strong>{{ data.action }}</strong> container <code>{{ data.containerName }}</code>?</p>
      @if (data.action === 'kill' || data.action === 'stop') {
        <p class="warn-text">Any active connections and unsaved state inside the container will be terminated.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true">Confirm {{ data.action }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .warn-text {
      color: #ef4444;
      font-size: 0.875rem;
    }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  `],
})
export class ActionConfirmDialogComponent {
  readonly data: ActionDialogData = inject(MAT_DIALOG_DATA);
}
