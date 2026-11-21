import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface DeleteDialogData {
  containerId: string;
  containerName: string;
}

@Component({
  selector: 'dp-delete-container-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  template: `
    <h2 mat-dialog-title class="danger-title">
      <mat-icon color="warn">delete_forever</mat-icon>
      Delete Container Permanently
    </h2>
    <mat-dialog-content>
      <p>This action <strong>CANNOT</strong> be undone. The container and its non-volume data will be permanently destroyed.</p>
      <p>Please type <code>{{ data.containerName }}</code> to confirm:</p>
      
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Container Name</mat-label>
        <input
          matInput
          [(ngModel)]="confirmInput"
          [placeholder]="data.containerName"
          autocomplete="off"
        />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        color="warn"
        [disabled]="confirmInput.trim() !== data.containerName"
        [mat-dialog-close]="true"
      >
        I understand, delete this container
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .danger-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #b91c1c;
    }
    .full-width {
      width: 100%;
      margin-top: 8px;
    }
    code {
      background: #fee2e2;
      color: #991b1b;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
  `],
})
export class DeleteContainerDialogComponent {
  readonly data: DeleteDialogData = inject(MAT_DIALOG_DATA);
  confirmInput: string = '';
}
