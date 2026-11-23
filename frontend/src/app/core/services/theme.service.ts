import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ActiveTheme = 'dark' | 'light';

const STORAGE_KEY = 'dockpilot_theme_mode';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly mediaQuery: MediaQueryList | null =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  private readonly systemPrefersDark = signal<boolean>(this.mediaQuery?.matches ?? true);

  readonly mode = signal<ThemeMode>(this.getInitialMode());

  readonly activeTheme = computed<ActiveTheme>(() => {
    const currentMode = this.mode();
    if (currentMode === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return currentMode;
  });

  constructor() {
    // Listen for OS color scheme shifts
    if (this.mediaQuery) {
      if (typeof this.mediaQuery.addEventListener === 'function') {
        this.mediaQuery.addEventListener('change', (e: MediaQueryListEvent) => {
          this.systemPrefersDark.set(e.matches);
        });
      } else if (typeof (this.mediaQuery as any).addListener === 'function') {
        (this.mediaQuery as any).addListener((e: MediaQueryListEvent) => {
          this.systemPrefersDark.set(e.matches);
        });
      }
    }

    // Synchronize DOM classes whenever activeTheme changes
    effect(() => {
      const theme = this.activeTheme();
      if (typeof document !== 'undefined' && document.documentElement) {
        const root = document.documentElement;
        if (theme === 'light') {
          root.classList.remove('dark-theme');
          root.classList.add('light-theme');
          root.style.colorScheme = 'light';
        } else {
          root.classList.remove('light-theme');
          root.classList.add('dark-theme');
          root.style.colorScheme = 'dark';
        }
      }
    });
  }

  setMode(newMode: ThemeMode): void {
    this.mode.set(newMode);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, newMode);
      }
    } catch {
      // Storage access protected in sandbox
    }
  }

  private getInitialMode(): ThemeMode {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
        if (saved === 'dark' || saved === 'light' || saved === 'system') {
          return saved;
        }
      }
    } catch {
      // Storage unavailable
    }
    return 'system';
  }
}
