import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('should render title, description, and action button', () => {
    component.title = 'ZERO CRAFT DETECTED';
    component.description = 'Deploy a container to start telemetry.';
    component.actionLabel = 'Deploy Container';
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('.empty-title');
    const descEl = fixture.nativeElement.querySelector('.empty-desc');
    const btnEl = fixture.nativeElement.querySelector('.empty-action-btn');

    expect(titleEl.textContent.trim()).toBe('ZERO CRAFT DETECTED');
    expect(descEl.textContent.trim()).toContain('Deploy a container');
    expect(btnEl.textContent.trim()).toContain('Deploy Container');
  });

  it('should emit actionClicked on button click', () => {
    const emitSpy = jest.spyOn(component.actionClicked, 'emit');
    component.actionLabel = 'Retry';
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.empty-action-btn') as HTMLButtonElement;
    btn.click();
    expect(emitSpy).toHaveBeenCalled();
  });
});
