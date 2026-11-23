import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AmbientCanvasComponent } from './shared/components/ambient-canvas/ambient-canvas.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { PointerFxService } from './core/services/pointer-fx.service';

@Component({
  selector: 'dp-root',
  standalone: true,
  imports: [RouterOutlet, AmbientCanvasComponent, ToastComponent],
  template: `
    <dp-ambient-canvas></dp-ambient-canvas>
    <div class="film-grain" aria-hidden="true"></div>
    <div class="vignette-overlay" aria-hidden="true"></div>
    <router-outlet></router-outlet>
    <dp-toast-container></dp-toast-container>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      position: relative;
    }

    .film-grain {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    .vignette-overlay {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      background: radial-gradient(circle at 50% 50%, transparent 60%, rgba(6, 6, 9, 0.45) 100%);
    }
  `]
})
export class AppComponent implements OnInit {
  private readonly pointerFxService = inject(PointerFxService);

  ngOnInit(): void {
    this.pointerFxService.init();
  }
}
