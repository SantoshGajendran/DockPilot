import { Component, EventEmitter, HostListener, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

export interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'NAVIGATION' | 'SYSTEM';
}

@Component({
  selector: 'dp-shortcuts-overlay',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (isOpen()) {
      <div class="shortcuts-backdrop" (click)="close()" (keydown.escape)="close()">
        <div class="shortcuts-dialog glass-panel" (click)="$event.stopPropagation()">
          <div class="shortcuts-header">
            <div class="title-group">
              <dp-icon name="keyboard" [size]="18" class="kbd-icon"></dp-icon>
              <span class="shortcuts-title">KEYBOARD SHORTCUTS</span>
            </div>
            <button class="close-btn" (click)="close()" aria-label="Close shortcuts">
              <dp-icon name="close" [size]="16"></dp-icon>
            </button>
          </div>

          <div class="shortcuts-content">
            <div class="shortcut-section">
              <span class="section-title micro-label">NAVIGATION</span>
              <div class="shortcuts-grid">
                @for (item of navigationShortcuts; track item.description) {
                  <div class="shortcut-row">
                    <span class="shortcut-desc">{{ item.description }}</span>
                    <div class="keys-group">
                      @for (key of item.keys; track key) {
                        <kbd class="key-badge">{{ key }}</kbd>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="shortcut-section">
              <span class="section-title micro-label">COMMAND & CONTROL</span>
              <div class="shortcuts-grid">
                @for (item of controlShortcuts; track item.description) {
                  <div class="shortcut-row">
                    <span class="shortcut-desc">{{ item.description }}</span>
                    <div class="keys-group">
                      @for (key of item.keys; track key) {
                        <kbd class="key-badge">{{ key }}</kbd>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <div class="shortcuts-footer">
            <span>Press <kbd class="footer-kbd">ESC</kbd> to dismiss this overlay</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .shortcuts-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(6, 6, 9, 0.70);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: scFadeIn var(--duration-120) var(--ease-out);
    }

    .shortcuts-dialog {
      width: 100%;
      max-width: 580px;
      background: var(--bg-1);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-lg);
      box-shadow: 0 24px 54px -8px rgba(0, 0, 0, 0.85), inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
      overflow: hidden;
      animation: scScaleIn var(--duration-220) var(--ease-out);
    }

    .shortcuts-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--line);

      .title-group {
        display: flex;
        align-items: center;
        gap: 10px;

        .kbd-icon {
          color: var(--gold);
        }

        .shortcuts-title {
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0.08em;
          color: var(--text);
        }
      }

      .close-btn {
        background: transparent;
        border: none;
        color: var(--text-dim);
        cursor: pointer;
        padding: 4px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          color: var(--text);
          background: var(--bg-3);
        }

        &:focus-visible {
          outline: 2px solid var(--gold);
        }
      }
    }

    .shortcuts-content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .section-title {
      display: block;
      margin-bottom: 10px;
      color: var(--text-mute);
    }

    .shortcuts-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .shortcut-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;

      .shortcut-desc {
        font-family: var(--font-sans);
        font-size: 0.875rem;
        color: var(--text);
      }

      .keys-group {
        display: flex;
        align-items: center;
        gap: 4px;

        .key-badge {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-3);
          border: 1px solid var(--line-strong);
          border-radius: 4px;
          color: var(--gold-hi);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
      }
    }

    .shortcuts-footer {
      padding: 12px 20px;
      background: var(--bg-0);
      border-top: 1px solid var(--line);
      font-size: 0.75rem;
      color: var(--text-mute);
      text-align: center;

      .footer-kbd {
        font-family: var(--font-mono);
        padding: 2px 6px;
        background: var(--bg-2);
        border: 1px solid var(--line);
        border-radius: 3px;
        color: var(--text-dim);
      }
    }

    @keyframes scFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scScaleIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class ShortcutsOverlayComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly router = inject(Router);
  readonly isOpen = signal<boolean>(false);

  private gSequenceActive = false;
  private gSequenceTimer: any = null;

  readonly navigationShortcuts: ShortcutItem[] = [
    { keys: ['g', 'd'], description: 'Navigate to Overview Dashboard', category: 'NAVIGATION' },
    { keys: ['g', 'c'], description: 'Navigate to Containers List', category: 'NAVIGATION' },
    { keys: ['g', 'l'], description: 'Navigate to Live Logs Explorer', category: 'NAVIGATION' },
    { keys: ['g', 'h'], description: 'Navigate to Host Server', category: 'NAVIGATION' },
    { keys: ['g', 'p'], description: 'Navigate to Compose Projects', category: 'NAVIGATION' },
    { keys: ['g', 'e'], description: 'Navigate to Events Timeline', category: 'NAVIGATION' },
    { keys: ['g', 'a'], description: 'Navigate to Alerts & Warnings', category: 'NAVIGATION' },
    { keys: ['g', 'r'], description: 'Navigate to Resources', category: 'NAVIGATION' }
  ];

  readonly controlShortcuts: ShortcutItem[] = [
    { keys: ['Ctrl', 'K'], description: 'Open Command Palette', category: 'SYSTEM' },
    { keys: ['?'], description: 'Toggle Shortcuts Overlay', category: 'SYSTEM' },
    { keys: ['Esc'], description: 'Dismiss Modal or Palette', category: 'SYSTEM' }
  ];

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

    if (isInput) return;

    if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.toggle();
      return;
    }

    if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.close();
      return;
    }

    // Two-key chord navigation (e.g. g then d, c, l)
    if (!this.isOpen()) {
      if (event.key.toLowerCase() === 'g' && !this.gSequenceActive) {
        this.gSequenceActive = true;
        clearTimeout(this.gSequenceTimer);
        this.gSequenceTimer = setTimeout(() => {
          this.gSequenceActive = false;
        }, 1000);
        return;
      }

      if (this.gSequenceActive) {
        this.gSequenceActive = false;
        clearTimeout(this.gSequenceTimer);
        const key = event.key.toLowerCase();
        switch (key) {
          case 'd':
            this.router.navigateByUrl('/dashboard');
            break;
          case 'c':
            this.router.navigateByUrl('/containers');
            break;
          case 'l':
            this.router.navigateByUrl('/logs');
            break;
          case 'h':
            this.router.navigateByUrl('/host');
            break;
          case 'p':
            this.router.navigateByUrl('/projects');
            break;
          case 'e':
            this.router.navigateByUrl('/events');
            break;
          case 'a':
            this.router.navigateByUrl('/alerts');
            break;
          case 'r':
            this.router.navigateByUrl('/resources');
            break;
        }
      }
    }
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }
}
