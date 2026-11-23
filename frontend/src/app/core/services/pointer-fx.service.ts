import { Injectable, NgZone, inject, effect } from '@angular/core';
import { AtmosphereService } from './atmosphere.service';

@Injectable({
  providedIn: 'root'
})
export class PointerFxService {
  private readonly ngZone = inject(NgZone);
  private readonly atmosphereService = inject(AtmosphereService);
  private rafId: number | null = null;
  private latestX = 0;
  private latestY = 0;
  private isListening = false;
  private isQuietMode = false;

  constructor() {
    effect(() => {
      this.isQuietMode = this.atmosphereService.quietMode();
    });
  }

  private readonly reducedMotionQuery: MediaQueryList | null =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.isQuietMode || this.reducedMotionQuery?.matches) {
      return;
    }

    this.latestX = event.clientX;
    this.latestY = event.clientY;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.updateCoordinates);
    }
  };

  private readonly updateCoordinates = (): void => {
    this.rafId = null;
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.style.setProperty('--mx', `${this.latestX}px`);
      document.documentElement.style.setProperty('--my', `${this.latestY}px`);
    }
  };

  /**
   * Initializes the single delegated pointermove listener outside NgZone
   * to avoid triggering Angular change detection on cursor movements.
   */
  init(): void {
    if (this.isListening || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('pointermove', this.onPointerMove, { passive: true });
    });

    this.isListening = true;
  }

  setQuietMode(enabled: boolean): void {
    this.isQuietMode = enabled;
  }

  destroy(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointermove', this.onPointerMove);
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isListening = false;
  }
}
