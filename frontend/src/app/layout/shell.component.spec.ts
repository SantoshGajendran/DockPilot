import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ShellComponent } from './shell.component';
import { NAVIGATION_ITEMS } from '../core/config/navigation.config';
import { AlertsService } from '../core/services/alerts.service';
import { ThemeService } from '../core/services/theme.service';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let mockAlertsService: any;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    mockAlertsService = {
      getActiveCount: jest.fn().mockReturnValue(of({ active_count: 2 })),
    };

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AlertsService, useValue: mockAlertsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render all navigation items from config', () => {
    expect(component.navItems.length).toBe(NAVIGATION_ITEMS.length);
  });

  it('should toggle sidebar collapse state', () => {
    const initial = component.isCollapsed();
    component.toggleSidebar();
    expect(component.isCollapsed()).toBe(!initial);
  });

  it('should fetch active alerts count on init', () => {
    expect(mockAlertsService.getActiveCount).toHaveBeenCalled();
    expect(component.activeAlertsCount()).toBe(2);
  });

  it('should render theme toggle button with correct initial icon', () => {
    const themeBtn = fixture.nativeElement.querySelector('.theme-toggle-btn');
    expect(themeBtn).toBeTruthy();
    const icon = themeBtn.querySelector('mat-icon');
    expect(icon).toBeTruthy();
    expect(icon.textContent.trim()).toBe('brightness_auto');
  });

  it('should open theme menu and call themeService.setMode when items are clicked', () => {
    const setModeSpy = jest.spyOn(themeService, 'setMode');
    const themeBtn = fixture.nativeElement.querySelector('.theme-toggle-btn') as HTMLButtonElement;
    expect(themeBtn).toBeTruthy();

    themeBtn.click();
    fixture.detectChanges();

    const menuItems = document.querySelectorAll('button[mat-menu-item]');
    expect(menuItems.length).toBe(3);

    // Click 'dark' option
    (menuItems[1] as HTMLButtonElement).click();
    expect(setModeSpy).toHaveBeenCalledWith('dark');

    // Click 'light' option
    (menuItems[2] as HTMLButtonElement).click();
    expect(setModeSpy).toHaveBeenCalledWith('light');

    // Click 'system' option
    (menuItems[0] as HTMLButtonElement).click();
    expect(setModeSpy).toHaveBeenCalledWith('system');
  });

  it('should render SSE connection status chip with connected status class', () => {
    component.sseService.connectionState.set('connected');
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('mat-chip.status-connected');
    expect(chip).toBeTruthy();
    expect(chip.textContent.trim()).toContain('connected');
  });
});
