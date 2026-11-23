import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeMode } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let matchMediaListeners: ((e: MediaQueryListEvent) => void)[] = [];

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    matchMediaListeners = [];

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            matchMediaListeners.push(callback);
          }
        }),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
  });

  it('should be created and default to system mode when no storage exists', () => {
    expect(service).toBeTruthy();
    expect(service.mode()).toBe('system');
    expect(service.activeTheme()).toBe('dark');
  });

  it('should resolve initial mode from localStorage when available', () => {
    localStorage.setItem('dockpilot_theme_mode', 'light');
    const newService = TestBed.runInInjectionContext(() => new ThemeService());
    expect(newService.mode()).toBe('light');
    expect(newService.activeTheme()).toBe('light');
  });

  it('should set dark mode and apply .dark-theme to documentElement', () => {
    service.setMode('dark');
    TestBed.flushEffects();
    expect(service.mode()).toBe('dark');
    expect(service.activeTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(document.documentElement.classList.contains('light-theme')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('dockpilot_theme_mode')).toBe('dark');
  });

  it('should set light mode and apply .light-theme to documentElement', () => {
    service.setMode('light');
    TestBed.flushEffects();
    expect(service.mode()).toBe('light');
    expect(service.activeTheme()).toBe('light');
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem('dockpilot_theme_mode')).toBe('light');
  });

  it('should react to OS theme changes when in system mode', () => {
    service.setMode('system');
    TestBed.flushEffects();
    expect(service.mode()).toBe('system');
    expect(service.activeTheme()).toBe('dark');

    // Simulate OS change to light
    matchMediaListeners.forEach(fn => fn({ matches: false } as MediaQueryListEvent));
    TestBed.flushEffects();
    expect(service.activeTheme()).toBe('light');
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
  });
});
