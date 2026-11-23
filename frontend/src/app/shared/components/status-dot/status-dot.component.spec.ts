import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusDotComponent } from './status-dot.component';

describe('StatusDotComponent', () => {
  let component: StatusDotComponent;
  let fixture: ComponentFixture<StatusDotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusDotComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusDotComponent);
    component = fixture.componentInstance;
  });

  it('should pulse when status is running or restarting', () => {
    component.status = 'running';
    fixture.detectChanges();
    expect(component.isPulsing).toBe(true);
    expect(fixture.nativeElement.querySelector('.dot-core').classList.contains('pulsing')).toBe(true);

    component.status = 'restarting';
    fixture.detectChanges();
    expect(component.isPulsing).toBe(true);
  });

  it('should remain static and non-pulsing when stopped', () => {
    component.status = 'stopped';
    fixture.detectChanges();
    expect(component.isPulsing).toBe(false);
    expect(fixture.nativeElement.querySelector('.dot-core').classList.contains('pulsing')).toBe(false);
  });
});
