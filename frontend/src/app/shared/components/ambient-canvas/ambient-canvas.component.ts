import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  effect
} from '@angular/core';
import { AtmosphereService } from '../../../core/services/atmosphere.service';

@Component({
  selector: 'dp-ambient-canvas',
  standalone: true,
  template: `
    <canvas #ambientCanvas class="ambient-canvas"></canvas>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: -2;
      pointer-events: none;
      overflow: hidden;
    }

    .ambient-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  `]
})
export class AmbientCanvasComponent implements OnInit, OnDestroy {
  @ViewChild('ambientCanvas', { static: true })
  private canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly ngZone = inject(NgZone);
  private readonly atmosphereService = inject(AtmosphereService);

  private ctx: CanvasRenderingContext2D | null = null;
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private readonly targetFps = 30;
  private readonly frameInterval = 1000 / this.targetFps;

  private width = 0;
  private height = 0;
  private gridOffset = 0;
  private pulseOffset = 0;
  private isRunning = false;

  constructor() {
    // React to quiet mode shifts
    effect(() => {
      const quiet = this.atmosphereService.quietMode();
      if (quiet) {
        this.stop();
        this.clear();
      } else {
        this.start();
      }
    });
  }

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.ctx = this.canvasRef.nativeElement.getContext('2d', { alpha: true });
    this.handleResize();

    window.addEventListener('resize', this.onWindowResize, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    if (!this.atmosphereService.quietMode()) {
      this.start();
    }
  }

  ngOnDestroy(): void {
    this.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private readonly onWindowResize = (): void => {
    this.handleResize();
  };

  private readonly onVisibilityChange = (): void => {
    if (typeof document === 'undefined') {
      return;
    }
    if (document.hidden) {
      this.stop();
    } else if (!this.atmosphereService.quietMode()) {
      this.start();
    }
  };

  private handleResize(): void {
    if (!this.canvasRef) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.width = canvas.parentElement?.clientWidth || window.innerWidth;
    this.height = canvas.parentElement?.clientHeight || window.innerHeight;

    canvas.width = this.width * dpr;
    canvas.height = this.height * dpr;

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  private start(): void {
    if (
      this.isRunning ||
      typeof window === 'undefined' ||
      this.atmosphereService.quietMode() ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ) {
      return;
    }
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    this.ngZone.runOutsideAngular(() => {
      this.loop(this.lastFrameTime);
    });
  }

  private stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private clear(): void {
    if (this.ctx && this.width && this.height) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.isRunning) {
      return;
    }

    const elapsed = timestamp - this.lastFrameTime;

    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
      this.render();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const ctx = this.ctx;
    if (!ctx || this.width === 0 || this.height === 0) {
      return;
    }

    ctx.clearRect(0, 0, this.width, this.height);

    const energy = this.atmosphereService.energy();
    this.gridOffset = (this.gridOffset + 0.3) % 40;
    this.pulseOffset += 0.03;

    // 1. Perspective Dot Grid
    const horizonY = this.height * 0.45;
    const vpX = this.width * 0.5;
    const rows = 14;
    const cols = 22;

    let dotColor = 'rgba(139, 92, 246, 0.12)'; // Calm violet shimmer
    if (energy === 'warning') {
      const pulseAlpha = 0.12 + Math.sin(this.pulseOffset) * 0.08;
      dotColor = `rgba(212, 175, 55, ${pulseAlpha})`; // Gold pulse
    } else if (energy === 'critical') {
      dotColor = 'rgba(244, 63, 94, 0.18)'; // Critical red
    }

    ctx.fillStyle = dotColor;

    for (let r = 1; r <= rows; r++) {
      const normY = (r + this.gridOffset / 40) / rows;
      const py = horizonY + (this.height - horizonY) * Math.pow(normY, 2.2);
      const rowWidth = this.width * (0.3 + 0.9 * normY);
      const dotSize = Math.max(1, 1.8 * normY);

      for (let c = 0; c <= cols; c++) {
        const normX = c / cols;
        const px = vpX + (normX - 0.5) * rowWidth;

        if (px >= 0 && px <= this.width && py >= 0 && py <= this.height) {
          ctx.beginPath();
          ctx.arc(px, py, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 2. Critical Edge Glow
    if (energy === 'critical') {
      ctx.save();
      const edgeGradient = ctx.createRadialGradient(
        this.width * 0.5,
        this.height * 0.5,
        Math.min(this.width, this.height) * 0.4,
        this.width * 0.5,
        this.height * 0.5,
        Math.max(this.width, this.height) * 0.75
      );
      edgeGradient.addColorStop(0, 'rgba(244, 63, 94, 0)');
      edgeGradient.addColorStop(1, 'rgba(244, 63, 94, 0.15)');
      ctx.fillStyle = edgeGradient;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }
}
