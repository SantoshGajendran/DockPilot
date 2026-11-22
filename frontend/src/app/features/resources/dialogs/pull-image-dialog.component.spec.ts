import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PullImageDialogComponent } from './pull-image-dialog.component';
import { ResourcesService } from '../../../core/services/resources.service';

describe('PullImageDialogComponent', () => {
  let component: PullImageDialogComponent;
  let fixture: ComponentFixture<PullImageDialogComponent>;
  let serviceMock: jest.Mocked<Partial<ResourcesService>>;
  let dialogRefMock: { close: jest.Mock };

  beforeEach(async () => {
    dialogRefMock = { close: jest.fn() };
    serviceMock = {
      pullImage: jest.fn().mockReturnValue(of({ id: 'job-1', action: 'pull', status: 'pending' })),
      streamJob: jest.fn().mockReturnValue(of(
        { job_id: 'job-1', status: 'running', line: 'Pulling fs layer' },
        { job_id: 'job-1', status: 'completed', line: 'Status: Downloaded newer image' }
      )),
    };

    await TestBed.configureTestingModule({
      imports: [PullImageDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: ResourcesService, useValue: serviceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PullImageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize with idle status', () => {
    expect(component.status()).toBe('idle');
    expect(component.pulling()).toBe(false);
  });

  it('should start pull job and stream logs to completion', () => {
    component.imageName = 'alpine:latest';
    component.startPull();

    expect(serviceMock.pullImage).toHaveBeenCalledWith('alpine:latest');
    expect(serviceMock.streamJob).toHaveBeenCalledWith('job-1');
    expect(component.status()).toBe('completed');
    expect(component.finished()).toBe(true);
    expect(component.logLines().length).toBeGreaterThan(1);
  });

  it('should handle pull failure on initiation', () => {
    serviceMock.pullImage = jest.fn().mockReturnValue(
      throwError(() => ({ error: { detail: 'Repository not found' } }))
    );

    component.imageName = 'invalid:image';
    component.startPull();

    expect(component.status()).toBe('failed');
    expect(component.errorMessage()).toBe('Repository not found');
  });

  it('should close dialog with finished status', () => {
    component.close();
    expect(dialogRefMock.close).toHaveBeenCalledWith(false);
  });
});
