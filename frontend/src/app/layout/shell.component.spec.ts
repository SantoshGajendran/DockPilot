import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ShellComponent } from './shell.component';
import { NAVIGATION_ITEMS } from '../core/config/navigation.config';
import { AlertsService } from '../core/services/alerts.service';

describe('ShellComponent', () => {
  let component: ShellComponent;
  let fixture: ComponentFixture<ShellComponent>;
  let mockAlertsService: any;

  beforeEach(async () => {
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

  it('should fetch active alerts count on init', () => {
    expect(mockAlertsService.getActiveCount).toHaveBeenCalled();
    expect(component.activeAlertsCount()).toBe(2);
  });
});
