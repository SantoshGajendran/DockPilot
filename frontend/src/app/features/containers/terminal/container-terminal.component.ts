import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

import { AuthService } from '../../../core/services/auth.service';
import { TerminalService } from '../../../core/services/terminal.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TERMINAL_DARK_THEME, TERMINAL_LIGHT_THEME } from '../../terminal/terminal-view.component';
import {
  TerminalConnectionState,
  TerminalResizeMessage,
  TerminalStatus,
} from '../../../core/models/terminal.model';
import { TERMINAL_CONFIG } from '../../../core/constants/terminal.constants';

@Component({
  selector: 'dp-container-terminal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './container-terminal.component.html',
  styleUrls: ['./container-terminal.component.scss'],
})
export class ContainerTerminalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) containerId!: string;
  @Input() containerName = '';

  @ViewChild('terminalContainer', { static: false })
  terminalContainer?: ElementRef<HTMLDivElement>;

  private readonly terminalService = inject(TerminalService);
  private readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);

  readonly terminalStatus = signal<TerminalStatus | null>(null);
  readonly loading = signal<boolean>(true);
  readonly connectionState = signal<TerminalConnectionState>('connecting');
  readonly disconnectReason = signal<string>('');
  readonly selectedShell = signal<string>(TERMINAL_CONFIG.defaultShell);
  readonly allowedShells = signal<string[]>([...TERMINAL_CONFIG.allowedShells]);
  readonly isDisabled = signal<boolean>(false);
  readonly isForbidden = signal<boolean>(false);
  readonly isRecorded = computed(() => !!this.terminalStatus()?.record_sessions);

  terminal: Terminal | null = null;
  fitAddon: FitAddon | null = null;
  ws: WebSocket | null = null;
  private resizeObserver: ResizeObserver | null = null;

  get term(): Terminal | null {
    return this.terminal;
  }
  set term(t: Terminal | null) {
    this.terminal = t;
  }

  constructor() {
    effect(() => {
      const theme = this.themeService.activeTheme();
      if (this.terminal) {
        this.terminal.options.theme = theme === 'dark' ? TERMINAL_DARK_THEME : TERMINAL_LIGHT_THEME;
      }
    });
  }

  ngOnInit(): void {
    if (!this.authService.hasRole('admin')) {
      this.isForbidden.set(true);
      this.loading.set(false);
      return;
    }

    this.loadStatus();
  }

  loadStatus(): void {
    this.loading.set(true);
    this.terminalService.getStatus(this.containerId).subscribe({
      next: (status) => {
        this.terminalStatus.set(status);
        if (status.allowed_shells?.length) {
          this.allowedShells.set(status.allowed_shells);
          if (!status.allowed_shells.includes(this.selectedShell())) {
            this.selectedShell.set(status.allowed_shells[0]);
          }
        }
        if (!status.enabled) {
          this.isDisabled.set(true);
          this.loading.set(false);
          return;
        }
        this.loading.set(false);
        // Wait for container to be rendered
        setTimeout(() => this.initTerminal(), 0);
      },
      error: (err) => {
        if (err.status === 404) {
          this.isDisabled.set(true);
        } else if (err.status === 403) {
          this.isForbidden.set(true);
        } else {
          this.disconnectReason.set(err.error?.detail || 'Failed to load terminal status');
          this.connectionState.set('error');
        }
        this.loading.set(false);
      },
    });
  }

  initTerminal(): void {
    if (!this.terminalContainer?.nativeElement) {
      return;
    }

    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }

    try {
      const theme = this.themeService.activeTheme();
      this.terminal = new Terminal({
        fontFamily: TERMINAL_CONFIG.fontFamily,
        fontSize: TERMINAL_CONFIG.fontSize,
        cursorBlink: TERMINAL_CONFIG.cursorBlink,
        theme: theme === 'dark' ? TERMINAL_DARK_THEME : TERMINAL_LIGHT_THEME,
      });

      this.fitAddon = new FitAddon();
      this.terminal.loadAddon(this.fitAddon);
      this.terminal.open(this.terminalContainer.nativeElement);
      this.fit();

      this.terminal.onData((data) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(data);
        }
      });

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.fit();
        });
        this.resizeObserver.observe(this.terminalContainer.nativeElement);
      }
    } catch (e) {
      // In test/mock environments where canvas is absent
    }

    this.connect();
  }

  connect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState.set('connecting');
    this.disconnectReason.set('');

    try {
      this.ws = this.terminalService.createWebSocket(this.containerId, this.selectedShell());

      this.ws.onopen = () => {
        this.connectionState.set('connected');
        this.terminal?.focus();
        this.fit();
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.terminal?.write(event.data);
        } else if (event.data instanceof ArrayBuffer) {
          const uint8 = new Uint8Array(event.data);
          this.terminal?.write(uint8);
        }
      };

      this.ws.onerror = () => {
        this.connectionState.set('error');
        this.disconnectReason.set('WebSocket connection error occurred.');
      };

      this.ws.onclose = (event) => {
        this.connectionState.set('disconnected');
        let reason = 'Terminal session ended';
        if (event.code === 4408) {
          reason = 'Session closed due to inactivity timeout.';
        } else if (event.code === 4409) {
          reason = 'Maximum session duration reached.';
        } else if (event.code === 4429) {
          reason = 'Maximum concurrent terminal sessions reached.';
        } else if (event.code === 4403) {
          reason = 'Unauthorized: Admin role required.';
        } else if (event.code === 4404) {
          reason = 'Terminal feature is disabled.';
        } else if (event.reason) {
          reason = event.reason;
        }
        this.disconnectReason.set(reason);
        this.terminal?.write(`\r\n\x1b[31m[${reason}]\x1b[0m\r\n`);
      };
    } catch (err: any) {
      this.connectionState.set('error');
      this.disconnectReason.set(err?.message || 'Failed to establish connection.');
    }
  }

  reconnect(): void {
    this.terminal?.clear();
    this.connect();
  }

  clear(): void {
    this.terminal?.clear();
  }

  onShellChange(newShell: string): void {
    this.selectedShell.set(newShell);
    this.reconnect();
  }

  fit(): void {
    try {
      this.fitAddon?.fit();
      if (this.terminal && this.ws && this.ws.readyState === WebSocket.OPEN) {
        const resizeMsg: TerminalResizeMessage = {
          type: 'resize',
          cols: this.terminal.cols,
          rows: this.terminal.rows,
        };
        this.ws.send(JSON.stringify(resizeMsg));
      }
    } catch (e) {
      // ignore
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.terminal) {
      this.terminal.dispose();
      this.terminal = null;
    }
  }
}
