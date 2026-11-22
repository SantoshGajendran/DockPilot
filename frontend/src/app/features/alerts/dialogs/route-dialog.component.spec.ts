import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RouteDialogComponent } from './route-dialog.component';

describe('RouteDialogComponent', () => {
  let component: RouteDialogComponent;
  let fixture: ComponentFixture<RouteDialogComponent>;
  let mockDialogRef: any;

  beforeEach(async () => {
    mockDialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RouteDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            channels: [{ id: 1, name: 'Slack', channel_type: 'slack' }],
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RouteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate name and channel', () => {
    component.form.patchValue({ name: '', channel_id: null });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ name: 'Critical Route', channel_id: 1 });
    expect(component.form.valid).toBe(true);
  });

  it('should close dialog with route payload on save', () => {
    component.form.patchValue({
      name: 'Critical Route',
      channel_id: 1,
      min_severity: 'critical',
      rule_type: 'all',
      scope_type: 'all',
      enabled: true,
    });

    component.onSave();
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      channel_id: 1,
      name: 'Critical Route',
      min_severity: 'critical',
      rule_type: null,
      scope_type: 'all',
      scope_value: null,
      enabled: true,
    });
  });
});
