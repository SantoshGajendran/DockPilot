import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlassPanelComponent } from './glass-panel.component';

describe('GlassPanelComponent', () => {
  let component: GlassPanelComponent;
  let fixture: ComponentFixture<GlassPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlassPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GlassPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render base glass panel', () => {
    expect(component).toBeTruthy();
    const panel = fixture.nativeElement.querySelector('.glass-panel-container');
    expect(panel).toBeTruthy();
    expect(panel.classList.contains('selected')).toBe(false);
  });

  it('should apply selected and border-sweep classes when inputs are true', () => {
    component.selected = true;
    component.borderSweep = true;
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.glass-panel-container');
    expect(panel.classList.contains('selected')).toBe(true);
    expect(panel.classList.contains('border-sweep')).toBe(true);
    expect(fixture.nativeElement.querySelector('.sweep-border-layer')).toBeTruthy();
  });
});
