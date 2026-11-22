import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ChannelDialogComponent } from './channel-dialog.component';

describe('ChannelDialogComponent', () => {
  let component: ChannelDialogComponent;
  let fixture: ComponentFixture<ChannelDialogComponent>;
  let mockDialogRef: any;

  beforeEach(async () => {
    mockDialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ChannelDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields for slack', () => {
    component.form.patchValue({ name: '', channel_type: 'slack', slack_url: '' });
    expect(component.form.invalid).toBe(true);

    component.form.patchValue({
      name: 'Slack SRE',
      slack_url: 'https://hooks.slack.com/services/123',
    });
    expect(component.form.valid).toBe(true);
  });

  it('should close dialog with payload on save', () => {
    component.form.patchValue({
      name: 'Slack Alerts',
      channel_type: 'slack',
      slack_url: 'https://hooks.slack.com/services/abc',
      enabled: true,
    });

    component.onSave();
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      name: 'Slack Alerts',
      channel_type: 'slack',
      enabled: true,
      config: {},
      secret: 'https://hooks.slack.com/services/abc',
    });
  });
});
