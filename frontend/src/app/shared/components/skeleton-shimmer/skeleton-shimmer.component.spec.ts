import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonShimmerComponent } from './skeleton-shimmer.component';

describe('SkeletonShimmerComponent', () => {
  let component: SkeletonShimmerComponent;
  let fixture: ComponentFixture<SkeletonShimmerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonShimmerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonShimmerComponent);
    component = fixture.componentInstance;
  });

  it('should render shimmer box with specified dimensions', () => {
    component.width = '240px';
    component.height = '48px';
    fixture.detectChanges();

    const box = fixture.nativeElement.querySelector('.skeleton-box');
    expect(box).toBeTruthy();
    expect(box.style.width).toBe('240px');
    expect(box.style.height).toBe('48px');
  });

  it('should apply circle class when variant is circle', () => {
    component.variant = 'circle';
    fixture.detectChanges();

    const box = fixture.nativeElement.querySelector('.skeleton-box');
    expect(box.classList.contains('circle')).toBe(true);
  });
});
