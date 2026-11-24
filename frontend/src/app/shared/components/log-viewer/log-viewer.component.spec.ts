import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { LogViewerComponent } from './log-viewer.component';
import { AnsiParserService } from '../../../core/services/ansi-parser.service';
import { SseService } from '../../../core/services/sse.service';
import { ToastService } from '../../../core/services/toast.service';
import { LogEntry } from '../../../core/models/logs.model';

describe('LogViewerComponent', () => {
  let component: LogViewerComponent;
  let fixture: ComponentFixture<LogViewerComponent>;
  let sseMock: { connect: jest.Mock };
  let toastMock: { info: jest.Mock };

  const mockLines: LogEntry[] = [
    {
      container_id: 'c1',
      container_name: 'redis',
      stream: 'stdout',
      timestamp: '2026-11-21T10:00:00Z',
      message: 'Server started successfully',
      level: 'INFO',
    },
    {
      container_id: 'c1',
      container_name: 'redis',
      stream: 'stderr',
      timestamp: '2026-11-21T10:01:00Z',
      message: 'High latency detected',
      level: 'WARN',
    },
  ];

  beforeEach(async () => {
    sseMock = {
      connect: jest.fn().mockReturnValue(of({})),
    };
    toastMock = {
      info: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LogViewerComponent, NoopAnimationsModule],
      providers: [
        AnsiParserService,
        { provide: SseService, useValue: sseMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LogViewerComponent);
    component = fixture.componentInstance;
    component.lines = mockLines;
    fixture.detectChanges();
  });

  it('should create and render lines', () => {
    expect(component).toBeTruthy();
    expect(component.allLines().length).toBe(2);
    expect(component.filteredLines().length).toBe(2);
  });

  it('should filter lines by query', () => {
    component.filterQuery.set('latency');
    expect(component.filteredLines().length).toBe(1);
    expect(component.filteredLines()[0].message).toContain('latency');
  });

  it('should toggle pause and wrap modes', () => {
    expect(component.isPaused()).toBe(false);
    component.togglePause();
    expect(component.isPaused()).toBe(true);

    component.wrapLines.set(false);
    expect(component.wrapLines()).toBe(false);
  });

  it('should clear lines', () => {
    component.lines = null;
    component.internalLines.set(mockLines);
    expect(component.allLines().length).toBe(2);

    component.clearLogs();
    expect(component.allLines().length).toBe(0);
  });

  it('should bind aria-label attributes to stream control buttons', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.viewer-actions button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn: HTMLButtonElement) => {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
