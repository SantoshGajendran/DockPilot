import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { AnsiSpan, LogEntry } from '../../../core/models/logs.model';
import { AnsiParserService } from '../../../core/services/ansi-parser.service';
import { SseService } from '../../../core/services/sse.service';
import { CONTAINER_ENDPOINTS } from '../../../core/constants/container.constants';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'dp-log-viewer',
  standalone: true,
  imports: [CommonModule, ScrollingModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './log-viewer.component.html',
  styleUrls: ['./log-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogViewerComponent implements OnInit, OnDestroy, OnChanges {
  private readonly inputLines = signal<LogEntry[] | null>(null);

  @Input()
  set lines(val: LogEntry[] | null) {
    this.inputLines.set(val);
  }
  get lines(): LogEntry[] | null {
    return this.inputLines();
  }

  @Input() containerId: string | null = null;
  @Input() showContainerName = false;

  @ViewChild('viewport') viewport?: CdkVirtualScrollViewport;

  private readonly ansiParser = inject(AnsiParserService);
  private readonly sseService = inject(SseService);
  private readonly toast = inject(ToastService);

  private streamSub: Subscription | null = null;
  private autoScrollTimeout: any = null;

  // Signals
  readonly internalLines = signal<LogEntry[]>([]);
  readonly filterQuery = signal<string>('');
  readonly wrapLines = signal<boolean>(true);
  readonly showTimestamps = signal<boolean>(true);
  readonly isPaused = signal<boolean>(false);

  readonly allLines = computed<LogEntry[]>(() => {
    const custom = this.inputLines();
    if (custom !== null && custom !== undefined) {
      return custom;
    }
    return this.internalLines();
  });

  readonly filteredLines = computed<LogEntry[]>(() => {
    const list = this.allLines();
    const query = this.filterQuery().trim().toLowerCase();
    if (!query) return list;
    return list.filter((l) => l.message.toLowerCase().includes(query));
  });

  ngOnInit(): void {
    if (this.containerId) {
      this.startLogStream(this.containerId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['containerId'] && !changes['containerId'].isFirstChange()) {
      const newId = changes['containerId'].currentValue;
      if (newId) {
        this.startLogStream(newId);
      } else {
        this.streamSub?.unsubscribe();
      }
    }
    if (changes['lines']) {
      this.checkAndAutoScroll();
    }
  }

  ngOnDestroy(): void {
    this.streamSub?.unsubscribe();
    if (this.autoScrollTimeout) {
      clearTimeout(this.autoScrollTimeout);
    }
  }

  startLogStream(cid: string): void {
    this.streamSub?.unsubscribe();
    this.internalLines.set([]);

    const url = CONTAINER_ENDPOINTS.containerLogs(cid, 200, true);
    this.streamSub = this.sseService.connect<LogEntry>(url).subscribe({
      next: (entry) => {
        this.internalLines.update((prev) => [...prev, entry]);
        this.checkAndAutoScroll();
      },
      error: () => {
        // Handled silently
      },
    });
  }

  onFilterChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterQuery.set(input.value);
  }

  togglePause(): void {
    this.isPaused.set(!this.isPaused());
    if (!this.isPaused()) {
      this.scrollToBottom();
    }
  }

  onScroll(index: number): void {
    const total = this.filteredLines().length;
    if (total > 10 && index < total - 5) {
      // User scrolled up manually
      this.isPaused.set(true);
    }
  }

  checkAndAutoScroll(): void {
    if (!this.isPaused()) {
      if (this.autoScrollTimeout) clearTimeout(this.autoScrollTimeout);
      this.autoScrollTimeout = setTimeout(() => {
        this.scrollToBottom();
      }, 50);
    }
  }

  scrollToBottom(): void {
    if (this.viewport) {
      this.viewport.scrollTo({ bottom: 0, behavior: 'auto' });
    }
  }

  copyLogs(): void {
    const text = this.filteredLines()
      .map((l) => (this.showTimestamps() && l.timestamp ? `[${l.timestamp}] ${l.message}` : l.message))
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.toast.info('Logs copied to clipboard');
    });
  }

  downloadLogs(): void {
    const text = this.filteredLines()
      .map((l) => (this.showTimestamps() && l.timestamp ? `[${l.timestamp}] ${l.message}` : l.message))
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dockpilot-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearLogs(): void {
    this.inputLines.set(null);
    this.internalLines.set([]);
  }

  parseSpans(msg: string): AnsiSpan[] {
    return this.ansiParser.parseToSpans(msg);
  }

  trackByFn(index: number, item: LogEntry): string {
    return `${item.container_id}-${item.timestamp || index}-${index}`;
  }
}
