import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NAVIGATION_ITEMS, NavItem } from '../../../core/config/navigation.config';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../icon/icon.component';

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  category: 'NAVIGATION' | 'ACTIONS' | 'RECENT';
  icon: string;
  path?: string;
  action?: () => void;
  minRole?: string;
}

const RECENT_COMMANDS_KEY = 'dockpilot_recent_commands';

@Component({
  selector: 'dp-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (isOpen()) {
      <div class="cmd-backdrop" (click)="close()" (keydown.escape)="close()">
        <div class="cmd-dialog glass-panel" (click)="$event.stopPropagation()">
          <div class="cmd-header">
            <dp-icon name="search" [size]="18" class="search-icon"></dp-icon>
            <input
              #searchInput
              type="text"
              class="cmd-input"
              placeholder="Type a command or search..."
              [(ngModel)]="query"
              (ngModelChange)="onQueryChange()"
              (keydown)="onKeydown($event)"
              autocomplete="off"
              spellcheck="false"
            />
            <kbd class="esc-kbd">ESC</kbd>
          </div>

          <div class="cmd-results" #resultsContainer>
            @if (filteredActions().length === 0) {
              <div class="cmd-empty">
                <span class="empty-title">NO MATCHING PROTOCOLS</span>
                <span class="empty-desc">No actions found for "{{ query }}"</span>
              </div>
            } @else {
              @for (item of filteredActions(); track item.id; let idx = $index) {
                <div
                  class="cmd-item"
                  [class.active]="idx === selectedIndex()"
                  (click)="execute(item)"
                  (mouseenter)="selectedIndex.set(idx)"
                >
                  <div class="cmd-item-icon">
                    <dp-icon [name]="item.icon" [size]="16"></dp-icon>
                  </div>
                  <div class="cmd-item-info">
                    <span class="cmd-item-title">{{ item.title }}</span>
                    @if (item.subtitle) {
                      <span class="cmd-item-sub">{{ item.subtitle }}</span>
                    }
                  </div>
                  <span class="cmd-category micro-label">{{ item.category }}</span>
                </div>
              }
            }
          </div>

          <div class="cmd-footer">
            <div class="footer-hint">
              <kbd class="mini-kbd">↑</kbd>
              <kbd class="mini-kbd">↓</kbd>
              <span>to navigate</span>
            </div>
            <div class="footer-hint">
              <kbd class="mini-kbd">↵</kbd>
              <span>to select</span>
            </div>
            <div class="footer-hint">
              <kbd class="mini-kbd">ESC</kbd>
              <span>to close</span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cmd-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(6, 6, 9, 0.70);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 12vh;
      animation: cmdFadeIn var(--duration-120) var(--ease-out);
    }

    .cmd-dialog {
      width: 100%;
      max-width: 620px;
      margin: 0 16px;
      background: var(--bg-1);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 48px -8px rgba(0, 0, 0, 0.85), inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
      overflow: hidden;
      animation: cmdScaleIn var(--duration-220) var(--ease-out);
    }

    .cmd-header {
      display: flex;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
      gap: 12px;

      .search-icon {
        color: var(--gold);
      }

      .cmd-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 1rem;

        &::placeholder {
          color: var(--text-mute);
        }
      }

      .esc-kbd {
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        padding: 3px 6px;
        background: var(--bg-3);
        border: 1px solid var(--line);
        border-radius: 4px;
        color: var(--text-dim);
      }
    }

    .cmd-results {
      max-height: 340px;
      overflow-y: auto;
      padding: 8px;
    }

    .cmd-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      gap: 12px;
      transition: background-color var(--duration-120) var(--ease-out);

      &.active {
        background: var(--bg-3);
        box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08);

        .cmd-item-icon {
          color: var(--gold);
        }

        .cmd-item-title {
          color: var(--gold-hi);
        }
      }

      .cmd-item-icon {
        color: var(--text-dim);
      }

      .cmd-item-info {
        flex: 1;
        display: flex;
        flex-direction: column;

        .cmd-item-title {
          font-family: var(--font-sans);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text);
        }

        .cmd-item-sub {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-mute);
        }
      }

      .cmd-category {
        font-size: 10px;
        color: var(--text-mute);
      }
    }

    .cmd-empty {
      padding: 36px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .empty-title {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        letter-spacing: 0.1em;
        color: var(--gold);
      }

      .empty-desc {
        font-family: var(--font-sans);
        font-size: 0.875rem;
        color: var(--text-mute);
      }
    }

    .cmd-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 18px;
      background: var(--bg-0);
      border-top: 1px solid var(--line);
      font-size: 0.75rem;
      color: var(--text-mute);

      .footer-hint {
        display: flex;
        align-items: center;
        gap: 6px;

        .mini-kbd {
          font-family: var(--font-mono);
          font-size: 0.6875rem;
          padding: 2px 5px;
          background: var(--bg-2);
          border: 1px solid var(--line);
          border-radius: 3px;
          color: var(--text-dim);
        }
      }
    }

    @keyframes cmdFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes cmdScaleIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class CommandPaletteComponent implements OnInit {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @Output() closed = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly isOpen = signal<boolean>(false);
  readonly selectedIndex = signal<number>(0);
  query = '';

  private allActions: CommandAction[] = [];
  readonly filteredActions = signal<CommandAction[]>([]);

  ngOnInit(): void {
    this.buildActionsList();
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    // Open on Ctrl+K or Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    }
  }

  open(): void {
    this.buildActionsList();
    this.query = '';
    this.filter();
    this.selectedIndex.set(0);
    this.isOpen.set(true);

    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 50);
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

  onQueryChange(): void {
    this.filter();
    this.selectedIndex.set(0);
  }

  onKeydown(event: KeyboardEvent): void {
    const list = this.filteredActions();
    if (list.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => (i - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const current = list[this.selectedIndex()];
      if (current) {
        this.execute(current);
      }
    }
  }

  execute(action: CommandAction): void {
    this.saveRecent(action);
    this.close();

    if (action.action) {
      action.action();
    } else if (action.path) {
      this.router.navigateByUrl(action.path);
    }
  }

  private filter(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.filteredActions.set(this.allActions);
      return;
    }

    const matches = this.allActions.filter((a) => {
      return (
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q))
      );
    });

    this.filteredActions.set(matches);
  }

  private buildActionsList(): void {
    const items: CommandAction[] = [];

    // Navigation items with RBAC check
    for (const item of NAVIGATION_ITEMS) {
      if (item.minRole && !this.authService.hasRole(item.minRole)) {
        continue;
      }
      items.push({
        id: `nav-${item.path}`,
        title: item.label,
        subtitle: `Navigate to ${item.path}`,
        category: 'NAVIGATION',
        icon: item.strokeIcon || item.icon,
        path: item.path,
        minRole: item.minRole
      });
    }

    // Quick Action shortcuts
    items.push({
      id: 'act-containers',
      title: 'Inspect Containers Fleet',
      subtitle: 'View container inventory and metrics',
      category: 'ACTIONS',
      icon: 'containers',
      path: '/containers'
    });

    items.push({
      id: 'act-logs',
      title: 'Open Live Logs Stream',
      subtitle: 'View virtualized log console',
      category: 'ACTIONS',
      icon: 'logs',
      path: '/logs'
    });

    items.push({
      id: 'act-host',
      title: 'Check Host Telemetry',
      subtitle: 'Interrogate physical hardware status',
      category: 'ACTIONS',
      icon: 'host',
      path: '/host'
    });

    this.allActions = items;
  }

  private saveRecent(action: CommandAction): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_COMMANDS_KEY) || '[]');
      const filtered = recent.filter((r: { id: string }) => r.id !== action.id);
      filtered.unshift({ id: action.id, title: action.title, path: action.path, icon: action.icon });
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(filtered.slice(0, 5)));
    } catch {
      // ignore localStorage errors
    }
  }
}
