import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  let component: IconComponent;
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
  });

  it('should create and render svg with 1.5px stroke width', () => {
    component.name = 'dashboard';
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
  });

  it('should render correct icon shape for containers', () => {
    component.name = 'containers';
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('svg');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});
