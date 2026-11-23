import { Directive, ElementRef, HostListener, Input, inject } from '@angular/core';
import { AtmosphereService } from '../../core/services/atmosphere.service';

@Directive({
  selector: '[dpMagneticHover]',
  standalone: true
})
export class MagneticHoverDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly atmosphereService = inject(AtmosphereService);

  @Input() maxPull = 4; // Max 4px verbatim pull

  private readonly reducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.reducedMotion || this.atmosphereService.quietMode()) {
      return;
    }

    const rect = this.el.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) / (rect.width / 2);
    const deltaY = (e.clientY - centerY) / (rect.height / 2);

    const pullX = Math.max(-this.maxPull, Math.min(this.maxPull, deltaX * this.maxPull));
    const pullY = Math.max(-this.maxPull, Math.min(this.maxPull, deltaY * this.maxPull));

    this.el.nativeElement.style.transform = `translate3d(${pullX.toFixed(1)}px, ${pullY.toFixed(1)}px, 0)`;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.el.nativeElement.style.transform = 'translate3d(0, 0, 0)';
  }
}
