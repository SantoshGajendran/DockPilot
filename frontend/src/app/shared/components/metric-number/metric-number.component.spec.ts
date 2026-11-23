import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetricNumberComponent } from './metric-number.component';

describe('MetricNumberComponent', () => {
  let component: MetricNumberComponent;
  let fixture: ComponentFixture<MetricNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricNumberComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MetricNumberComponent);
    component = fixture.componentInstance;
  });

  it('should create and render initial value with tabular-nums', () => {
    component.value = 42;
    component.unit = '%';
    fixture.detectChanges();

    const numeral = fixture.nativeElement.querySelector('.numeral');
    expect(numeral).toBeTruthy();
    expect(numeral.classList.contains('tabular-nums')).toBe(true);
    expect(fixture.nativeElement.querySelector('.metric-unit').textContent.trim()).toBe('%');
  });

  it('should map threshold severity class', () => {
    component.value = 80;
    component.warningThreshold = 75;
    component.criticalThreshold = 90;
    fixture.detectChanges();

    expect(component.severityClass).toBe('severity-warning');

    component.value = 95;
    fixture.detectChanges();
    expect(component.severityClass).toBe('severity-critical');
  });
});
