import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SparklineComponent } from './sparkline.component';

describe('SparklineComponent', () => {
  let component: SparklineComponent;
  let fixture: ComponentFixture<SparklineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SparklineComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SparklineComponent);
    component = fixture.componentInstance;
  });

  it('should create and render paths when data is provided', () => {
    component.data = [10, 20, 15, 30, 25, 40];
    component.width = 120;
    component.height = 30;
    component.ngOnChanges({
      data: { currentValue: component.data, previousValue: [], firstChange: true, isFirstChange: () => true }
    });
    fixture.detectChanges();

    const line = fixture.nativeElement.querySelector('.sparkline-line');
    const area = fixture.nativeElement.querySelector('.sparkline-area');
    expect(line).toBeTruthy();
    expect(area).toBeTruthy();
    expect(line.getAttribute('d')).toContain('M');
  });
});
