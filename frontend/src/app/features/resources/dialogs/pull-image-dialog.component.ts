import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { ResourcesService } from '../../../core/services/resources.service';

@Component({
  selector: 'dp-pull-image-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './pull-image-dialog.component.html',
  styleUrls: ['./pull-image-dialog.component.scss'],
})
export class PullImageDialogComponent implements OnDestroy {
  readonly dialogRef = inject(MatDialogRef<PullImageDialogComponent>);
  private readonly service = inject(ResourcesService);

  @ViewChild('terminalContainer') private terminalContainer?: ElementRef<HTMLDivElement>;

  imageName: string = '';
  readonly pulling = signal<boolean>(false);
  readonly finished = signal<boolean>(false);
  readonly status = signal<'idle' | 'pulling' | 'completed' | 'failed'>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly logLines = signal<string[]>([]);

  private streamSub?: Subscription;

  startPull(): void {
    const target = this.imageName.trim();
    if (!target) return;

    this.pulling.set(true);
    this.status.set('pulling');
    this.errorMessage.set(null);
    this.logLines.set([`Initiating pull for "${target}"...`]);

    this.service.pullImage(target).subscribe({
      next: (job) => {
        this.streamJobLogs(job.id);
      },
      error: (err) => {
        this.status.set('failed');
        this.pulling.set(false);
        this.errorMessage.set(err?.error?.detail || err?.message || 'Failed to start pull job.');
      },
    });
  }

  private streamJobLogs(jobId: string): void {
    this.streamSub = this.service.streamJob(jobId).subscribe({
      next: (event) => {
        if (event.line) {
          this.logLines.update((lines) => [...lines, event.line!]);
          this.scrollToBottom();
        }
        if (event.status === 'completed') {
          this.status.set('completed');
          this.pulling.set(false);
          this.finished.set(true);
        } else if (event.status === 'failed') {
          this.status.set('failed');
          this.pulling.set(false);
          this.finished.set(true);
          this.errorMessage.set('Pull operation failed.');
        }
      },
      error: (err) => {
        this.status.set('failed');
        this.pulling.set(false);
        this.finished.set(true);
        this.errorMessage.set(err?.message || 'Log stream disconnected.');
      },
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.terminalContainer) {
        this.terminalContainer.nativeElement.scrollTop = this.terminalContainer.nativeElement.scrollHeight;
      }
    }, 10);
  }

  close(): void {
    this.dialogRef.close(this.finished());
  }

  ngOnDestroy(): void {
    if (this.streamSub) {
      this.streamSub.unsubscribe();
    }
  }
}
