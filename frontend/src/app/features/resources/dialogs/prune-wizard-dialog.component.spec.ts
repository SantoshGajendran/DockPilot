import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { PruneWizardDialogComponent } from './prune-wizard-dialog.component';
import { ResourcesService } from '../../../core/services/resources.service';
import { PrunePreviewResponse, PruneResultResponse } from '../../../core/models/resources.model';

describe('PruneWizardDialogComponent', () => {
  let component: PruneWizardDialogComponent;
  let fixture: ComponentFixture<PruneWizardDialogComponent>;
  let serviceMock: jest.Mocked<Partial<ResourcesService>>;
  let dialogRefMock: { close: jest.Mock };

  const mockPreview: PrunePreviewResponse = {
    resource_type: 'images',
    items_count: 2,
    space_reclaimed_bytes: 4096000,
    items: [
      { id: 'img1', name: '<none>', size: 2048000, details: 'Dangling' },
      { id: 'img2', name: '<none>', size: 2048000, details: 'Dangling' },
    ],
    confirmation_token: 'token-xyz',
    expires_at: '2026-11-23T00:00:00Z',
  };

  const mockResult: PruneResultResponse = {
    resource_type: 'images',
    items_deleted: ['img1', 'img2'],
    space_reclaimed_bytes: 4096000,
  };

  beforeEach(async () => {
    dialogRefMock = { close: jest.fn() };
    serviceMock = {
      previewPruneImages: jest.fn().mockReturnValue(of(mockPreview)),
      confirmPruneImages: jest.fn().mockReturnValue(of(mockResult)),
      previewPruneVolumes: jest.fn().mockReturnValue(of({ ...mockPreview, resource_type: 'volumes' })),
      confirmPruneVolumes: jest.fn().mockReturnValue(of({ ...mockResult, resource_type: 'volumes' })),
      previewPruneNetworks: jest.fn().mockReturnValue(of({ ...mockPreview, resource_type: 'networks' })),
      confirmPruneNetworks: jest.fn().mockReturnValue(of({ ...mockResult, resource_type: 'networks' })),
    };

    await TestBed.configureTestingModule({
      imports: [PruneWizardDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { resourceType: 'images' } },
        { provide: ResourcesService, useValue: serviceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PruneWizardDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load preview data', () => {
    expect(serviceMock.previewPruneImages).toHaveBeenCalled();
    expect(component.previewData()?.items_count).toBe(2);
    expect(component.step()).toBe('preview');
  });

  it('should transition to confirm step', () => {
    component.proceedToConfirm();
    expect(component.step()).toBe('confirm');
  });

  it('should execute prune and transition to result step', () => {
    component.proceedToConfirm();
    component.executePrune();

    expect(serviceMock.confirmPruneImages).toHaveBeenCalledWith('token-xyz');
    expect(component.step()).toBe('result');
    expect(component.resultData()?.items_deleted.length).toBe(2);
  });

  it('should close dialog with refresh flag on done', () => {
    component.close(true);
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });
});
