import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'dp-session-expired-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Session Expired</h2>
    <mat-dialog-content>
      <p>Your session has expired due to inactivity. Please log in again to continue.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="onLogin()">Log In</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      font-size: 14px;
      line-height: 1.5;
    }
  `]
})
export class SessionExpiredDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SessionExpiredDialogComponent>, { optional: true });
  private readonly router = inject(Router, { optional: true });

  onLogin(): void {
    this.dialogRef?.close();
    this.router?.navigate(['/login']);
  }
}
