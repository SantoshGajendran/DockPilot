import { Component, Input, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dp-glass-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="glass-panel-container"
      [class.selected]="selected"
      [class.border-sweep]="borderSweep"
      [class.elevated]="elevated"
    >
      @if (spotlight) {
        <div class="spotlight-layer" aria-hidden="true"></div>
      }
      @if (borderSweep) {
        <div class="sweep-border-layer" aria-hidden="true"></div>
      }
      <div class="panel-content" [style.padding]="padding">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }

    .glass-panel-container {
      position: relative;
      background: var(--bg-2);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      box-shadow: var(--elevation-glass);
      backdrop-filter: blur(var(--blur-sm));
      -webkit-backdrop-filter: blur(var(--blur-sm));
      overflow: hidden;
      transition: border-color var(--duration-120) var(--ease-out), box-shadow var(--duration-220) var(--ease-out);

      &.elevated {
        background: var(--bg-3);
        box-shadow: var(--elevation-glass-elevated);
      }

      &.selected {
        border-color: var(--gold);
        box-shadow: var(--elevation-glass), var(--glow-gold);
      }

      &:hover .spotlight-layer {
        opacity: 1;
      }
    }

    .spotlight-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity var(--duration-220) var(--ease-out);
      background: radial-gradient(
        400px circle at var(--mx, 50%) var(--my, 50%),
        rgba(255, 255, 255, 0.05),
        transparent 60%
      );
    }

    :host-context(.light-theme) .spotlight-layer,
    :host-context([data-theme='light']) .spotlight-layer {
      background: radial-gradient(
        400px circle at var(--mx, 50%) var(--my, 50%),
        rgba(180, 83, 9, 0.05),
        transparent 60%
      );
    }

    .sweep-border-layer {
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      padding: 1px;
      pointer-events: none;
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        var(--gold) 45deg,
        transparent 90deg,
        transparent 180deg,
        var(--violet) 225deg,
        transparent 270deg
      );
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      animation: sweepRotate 4s linear infinite;
    }

    .panel-content {
      position: relative;
      z-index: 1;
    }

    @keyframes sweepRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class GlassPanelComponent {
  @Input({ transform: booleanAttribute }) selected = false;
  @Input({ transform: booleanAttribute }) borderSweep = false;
  @Input({ transform: booleanAttribute }) elevated = false;
  @Input({ transform: booleanAttribute }) spotlight = true;
  @Input() padding?: string;
}
