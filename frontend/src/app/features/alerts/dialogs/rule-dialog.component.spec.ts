import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { RuleDialogComponent } from './rule-dialog.component';
import { AlertsService } from '../../../core/services/alerts.service';

describe('RuleDialogComponent', () => {
  let component: RuleDialogComponent;
  let fixture: ComponentFixture<RuleDialogComponent>;
  let mockDialogRef: any;
  let mockAlertsService: any;

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    };
    mockAlertsService = {
      dryRunRule: jest.fn().mockReturnValue(
        of({
          rule_type: 'container_down',
          matches_count: 0,
          targets: [],
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [RuleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: AlertsService, useValue: mockAlertsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields', () => {
    component.form.patchValue({ name: '' });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({ name: 'Valid Name' });
    expect(component.form.valid).toBe(true);
  });

  it('should trigger dry-run evaluation', () => {
    component.runDryRun();
    expect(mockAlertsService.dryRunRule).toHaveBeenCalled();
    expect(component.dryRunResult()).toEqual({
      rule_type: 'container_down',
      matches_count: 0,
      targets: [],
    });
  });

  it('should close dialog with payload on save', () => {
    component.form.patchValue({
      name: 'Test Rule',
      rule_type: 'container_down',
      scope_type: 'all',
      severity: 'warning',
      cooldown_minutes: 15,
      enabled: true,
    });

    component.onSave();
    expect(mockDialogRef.close).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Rule',
        rule_type: 'container_down',
        scope_type: 'all',
      })
    );
  });
});
