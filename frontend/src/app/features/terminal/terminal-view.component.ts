import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ThemeService } from '../../core/services/theme.service';
import { TERMINAL_CONFIG } from '../../core/constants/terminal.constants';

export const TERMINAL_DARK_THEME = {
  background: '#080c14',
  foreground: '#f8fafc',
  cursor: '#3b82f6',
  selectionBackground: 'rgba(59, 130, 246, 0.3)',
};

export const TERMINAL_LIGHT_THEME = {
  background: '#f8fafc',
  foreground: '#0f172a',
  cursor: '#2563eb',
  selectionBackground: 'rgba(37, 99, 235, 0.2)',
};

@Component({
  selector: 'dp-terminal-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terminal-view.component.html',
  styleUrls: ['./terminal-view.component.scss'],
})
export class TerminalViewComponent implements OnInit, OnDestroy {
  readonly themeService = inject(ThemeService);

  @ViewChild('terminalContainer', { static: false })
  terminalContainer?: ElementRef<HTMLDivElement>;

  term: Terminal | null = null;
  fitAddon: FitAddon | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const theme = this.themeService.activeTheme();
      if (this.term) {
        this.term.options.theme = theme === 'dark' ? TERMINAL_DARK_THEME : TERMINAL_LIGHT_THEME;
      }
    });
  }

  ngOnInit(): void {}

  initTerminal(): void {
    if (!this.terminalContainer?.nativeElement) return;
    if (this.term) {
      this.term.dispose();
      this.term = null;
    }

    const theme = this.themeService.activeTheme();
    try {
      this.term = new Terminal({
        fontFamily: TERMINAL_CONFIG.fontFamily,
        fontSize: TERMINAL_CONFIG.fontSize,
        cursorBlink: TERMINAL_CONFIG.cursorBlink,
        theme: theme === 'dark' ? TERMINAL_DARK_THEME : TERMINAL_LIGHT_THEME,
      });

      this.fitAddon = new FitAddon();
      this.term.loadAddon(this.fitAddon);
      this.term.open(this.terminalContainer.nativeElement);
      this.fitAddon.fit();

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.fitAddon?.fit();
        });
        this.resizeObserver.observe(this.terminalContainer.nativeElement);
      }
    } catch {
      // test environment without full canvas support
    }
  }

  write(data: string | Uint8Array): void {
    this.term?.write(data);
  }

  clear(): void {
    this.term?.clear();
  }

  fit(): void {
    try {
      this.fitAddon?.fit();
    } catch {
      // ignore
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.term) {
      this.term.dispose();
      this.term = null;
    }
  }
}
