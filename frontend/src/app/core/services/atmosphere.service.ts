import { Injectable, signal } from '@angular/core';

export type SystemAtmosphereEnergy = 'healthy' | 'warning' | 'critical';

const QUIET_MODE_KEY = 'dockpilot_quiet_mode';

@Injectable({
  providedIn: 'root'
})
export class AtmosphereService {
  private readonly prefersReducedMotion: boolean =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  readonly quietMode = signal<boolean>(this.getInitialQuietMode());
  readonly energy = signal<SystemAtmosphereEnergy>('healthy');

  constructor() {
    // If OS prefers reduced motion, default quietMode to true unless explicitly overridden
    if (this.prefersReducedMotion && typeof localStorage !== 'undefined' && localStorage.getItem(QUIET_MODE_KEY) === null) {
      this.quietMode.set(true);
    }
  }

  private getInitialQuietMode(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    const stored = localStorage.getItem(QUIET_MODE_KEY);
    return stored === 'true';
  }

  setQuietMode(enabled: boolean): void {
    this.quietMode.set(enabled);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUIET_MODE_KEY, String(enabled));
    }
  }

  toggleQuietMode(): void {
    this.setQuietMode(!this.quietMode());
  }

  setEnergy(energy: SystemAtmosphereEnergy): void {
    this.energy.set(energy);
  }
}
