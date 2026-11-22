import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SilenceDialogComponent } from './silence-dialog.component';

describe('SilenceDialogComponent', () => {
  let component: SilenceDialogComponent;
  let fixture: ComponentFixture<SilenceDialogComponent>;
  let mockDialogRef: any;

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SilenceDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            event: {
              id: 1,
              rule_id: 2,
              rule_name: 'Test Rule',
              target_id: 'c123',
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SilenceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog with silence payload', () => {
    component.form.patchValue({ duration_minutes: 120, reason: 'Maintenance' });
    component.onSave();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      rule_id: 2,
      container_id: 'c123',
      duration_minutes: 120,
      reason: 'Maintenance',
    });
  });
});
