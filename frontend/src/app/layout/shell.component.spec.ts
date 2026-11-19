import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ShellComponent } from './shell.component';
import { NAVIGATION_ITEMS } from '../core/config/navigation.config';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([]), provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render all navigation items from config', () => {
    expect(component.navItems.length).toBe(NAVIGATION_ITEMS.length);
  });

  it('should toggle sidebar collapse state', () => {
    const initial = component.isCollapsed();
    component.toggleSidebar();
    expect(component.isCollapsed()).toBe(!initial);
  });
});
