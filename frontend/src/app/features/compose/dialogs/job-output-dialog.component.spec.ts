import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { JobOutputDialogComponent } from './job-output-dialog.component';
import { ComposeService } from '../../../core/services/compose.service';
import { JobStreamEvent } from '../../../core/models/compose.model';

describe('JobOutputDialogComponent', () => {
  let component: JobOutputDialogComponent;
  let fixture: ComponentFixture<JobOutputDialogComponent>;
  let composeServiceMock: { streamJob: jest.Mock };
  let dialogRefMock: { close: jest.Mock };

  beforeEach(async () => {
    composeServiceMock = {
      streamJob: jest.fn().mockReturnValue(
        of(
          { job_id: 'j1', line: 'Pulling images', status: 'running' } as JobStreamEvent,
          { job_id: 'j1', line: 'Containers started', status: 'completed', exit_code: 0 } as JobStreamEvent
        )
      ),
    };

    dialogRefMock = {
      close: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [JobOutputDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: ComposeService, useValue: composeServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { jobId: 'j1', projectName: 'dockpilot', action: 'up' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobOutputDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render streamed lines', () => {
    expect(component).toBeTruthy();
    expect(component.lines().length).toBe(2);
    expect(component.status()).toBe('completed');
    expect(component.exitCode()).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.dialog-header')?.textContent).toContain('dockpilot');
    expect(compiled.querySelector('.terminal-window')?.textContent).toContain('Containers started');
  });

  it('should close dialog with success status', () => {
    component.close();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });
});
