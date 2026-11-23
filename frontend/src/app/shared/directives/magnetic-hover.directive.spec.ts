import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MagneticHoverDirective } from './magnetic-hover.directive';

@Component({
  template: `<button dpMagneticHover class="test-btn">Action</button>`,
  standalone: true,
  imports: [MagneticHoverDirective]
})
class TestMagneticComponent {}

describe('MagneticHoverDirective', () => {
  let fixture: ComponentFixture<TestMagneticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestMagneticComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestMagneticComponent);
    fixture.detectChanges();
  });

  it('should reset transform on mouseleave', () => {
    const btn = fixture.nativeElement.querySelector('.test-btn') as HTMLElement;
    btn.dispatchEvent(new MouseEvent('mouseleave'));
    expect(btn.style.transform).toMatch(/translate3d\(0(?:px)?, 0(?:px)?, 0(?:px)?\)/);
  });
});
