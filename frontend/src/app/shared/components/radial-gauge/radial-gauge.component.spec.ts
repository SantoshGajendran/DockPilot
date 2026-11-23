import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RadialGaugeComponent } from './radial-gauge.component';

describe('RadialGaugeComponent', () => {
  let component: RadialGaugeComponent;
  let fixture: ComponentFixture<RadialGaugeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadialGaugeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RadialGaugeComponent);
    component = fixture.componentInstance;
  });

  it('should create and calculate arc geometry', () => {
    component.value = 50;
    component.size = 140;
    component.ngOnChanges({});
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.radius).toBeGreaterThan(0);
    expect(component.gaugeColor).toBe('#34D399');

    const valueArc = fixture.nativeElement.querySelector('.gauge-value-arc');
    expect(valueArc).toBeTruthy();
  });

  it('should switch color on warning and critical thresholds', () => {
    component.value = 85;
    component.warningThreshold = 80;
    component.criticalThreshold = 95;
    expect(component.gaugeColor).toBe('#F59E0B');

    component.value = 98;
    expect(component.gaugeColor).toBe('#F43F5E');
  });
});
