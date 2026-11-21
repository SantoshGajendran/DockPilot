import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';

import { ComposeService } from '../../../core/services/compose.service';
import { JobStatus, JobStreamEvent } from '../../../core/models/compose.model';

export interface JobDialogData {
  jobId: string;
  projectName: string;
  action: string;
}

@Component({
  selector: 'dp-job-output-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './job-output-dialog.component.html',
  styleUrls: ['./job-output-dialog.component.scss'],
})
export class JobOutputDialogComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly dialogRef = inject(MatDialogRef<JobOutputDialogComponent>);
  readonly data: JobDialogData = inject(MAT_DIALOG_DATA);
  private readonly composeService = inject(ComposeService);

  @ViewChild('terminalBody') private terminalContainer?: ElementRef<HTMLDivElement>;

  readonly lines = signal<string[]>([]);
  readonly status = signal<JobStatus>('running');
  readonly exitCode = signal<number | null>(null);

  private sub: Subscription | null = null;
  private shouldScroll = true;

  ngOnInit(): void {
    this.startStreaming();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  startStreaming(): void {
    this.sub = this.composeService.streamJob(this.data.jobId).subscribe({
      next: (event: JobStreamEvent) => {
        if (event.status) {
          this.status.set(event.status);
        }
        if (event.exit_code !== undefined && event.exit_code !== null) {
          this.exitCode.set(event.exit_code);
        }
        if (event.line) {
          this.lines.update((prev) => [...prev, event.line!]);
        }
      },
      error: (err) => {
        this.status.set('failed');
        this.lines.update((prev) => [...prev, `Stream error: ${err?.message || 'Connection lost'}`]);
      },
    });
  }

  onScroll(): void {
    const el = this.terminalContainer?.nativeElement;
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      this.shouldScroll = atBottom;
    }
  }

  scrollToBottom(): void {
    try {
      const el = this.terminalContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // Ignore
    }
  }

  close(): void {
    this.dialogRef.close(this.status() === 'completed');
  }
}
