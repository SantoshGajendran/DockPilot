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
  readonly pausedNewLinesCount = signal<number>(0);
  readonly expandedJsonLines = signal<Set<number>>(new Set());

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

  // Minimap ticks for WARN/ERROR density
  readonly minimapTicks = computed(() => {
    const lines = this.filteredLines();
    const total = lines.length;
    if (total === 0) return [];

    const ticks: { topPercent: number; level: string }[] = [];
    for (let i = 0; i < total; i++) {
      const level = lines[i].level?.toUpperCase();
      if (level === 'ERROR' || level === 'FATAL' || level === 'WARN' || lines[i].stream === 'stderr') {
        ticks.push({
          topPercent: (i / total) * 100,
          level: (level === 'ERROR' || level === 'FATAL' || lines[i].stream === 'stderr') ? 'error' : 'warn'
        });
      }
    }
    return ticks;
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
      if (this.isPaused()) {
        const diff = (this.lines?.length ?? 0) - (changes['lines'].previousValue?.length ?? 0);
        if (diff > 0) {
          this.pausedNewLinesCount.update((c) => c + diff);
        }
      } else {
        this.checkAndAutoScroll();
      }
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
    this.pausedNewLinesCount.set(0);

    const url = CONTAINER_ENDPOINTS.containerLogs(cid, 200, true);
    this.streamSub = this.sseService.connect<LogEntry>(url).subscribe({
      next: (entry) => {
        if (this.isPaused()) {
          this.pausedNewLinesCount.update((c) => c + 1);
        }
        this.internalLines.update((prev) => [...prev, entry]);
        if (!this.isPaused()) {
          this.checkAndAutoScroll();
        }
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
      this.pausedNewLinesCount.set(0);
      this.scrollToBottom();
    }
  }

  resumeAndScroll(): void {
    this.isPaused.set(false);
    this.pausedNewLinesCount.set(0);
    this.scrollToBottom();
  }

  onScroll(index: number): void {
    const total = this.filteredLines().length;
    if (total > 10 && index < total - 5) {
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
    this.pausedNewLinesCount.set(0);
  }

  parseSpans(msg: string): AnsiSpan[] {
    return this.ansiParser.parseToSpans(msg);
  }

  // JSON prettify helpers
  isLikelyJson(msg: string): boolean {
    const trimmed = msg.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }

  toggleJsonExpansion(index: number): void {
    this.expandedJsonLines.update((set) => {
      const next = new Set(set);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  getPrettyJson(msg: string): string {
    try {
      const parsed = JSON.parse(msg.trim());
      return JSON.stringify(parsed, null, 2);
    } catch {
      return msg;
    }
  }

  // Gutter colors matching design spec
  getGutterColor(entry: LogEntry): string {
    const level = entry.level?.toUpperCase();
    if (level === 'ERROR' || level === 'FATAL' || entry.stream === 'stderr') return '#F43F5E';
    if (level === 'WARN') return '#F59E0B';
    if (level === 'INFO') return '#8B5CF6';
    if (level === 'DEBUG' || level === 'TRACE') return '#6B6980';
    return 'transparent';
  }

  // Consistent color hash for container chips
  getContainerColor(name?: string): string {
    if (!name) return '#A78BFA';
    const colors = ['#38BDF8', '#A78BFA', '#34D399', '#F59E0B', '#EC4899', '#60A5FA'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }

  trackByFn(index: number, item: LogEntry): string {
    return `${item.container_id}-${item.timestamp || index}-${index}`;
  }
}
