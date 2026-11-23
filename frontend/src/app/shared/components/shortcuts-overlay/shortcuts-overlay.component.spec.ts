import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShortcutsOverlayComponent } from './shortcuts-overlay.component';

describe('ShortcutsOverlayComponent', () => {
  let component: ShortcutsOverlayComponent;
  let fixture: ComponentFixture<ShortcutsOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShortcutsOverlayComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ShortcutsOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and be closed by default', () => {
    expect(component).toBeTruthy();
    expect(component.isOpen()).toBe(false);
  });

  it('should open and close via methods', () => {
    component.open();
    expect(component.isOpen()).toBe(true);

    component.close();
    expect(component.isOpen()).toBe(false);
  });

  it('should toggle on ? key press', () => {
    const event = new KeyboardEvent('keydown', { key: '?' });
    window.dispatchEvent(event);
    expect(component.isOpen()).toBe(true);

    window.dispatchEvent(event);
    expect(component.isOpen()).toBe(false);
  });
});
