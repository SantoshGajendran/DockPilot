import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { ContainerTerminalComponent } from './container-terminal.component';
import { TerminalService } from '../../../core/services/terminal.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TERMINAL_DARK_THEME, TERMINAL_LIGHT_THEME } from '../../terminal/terminal-view.component';
import { TerminalStatus } from '../../../core/models/terminal.model';

class MockWebSocket {
  readyState = WebSocket.OPEN;
  binaryType = 'arraybuffer';
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: any) => void) | null = null;

  send = jest.fn();
  close = jest.fn();
}

describe('ContainerTerminalComponent', () => {
  let component: ContainerTerminalComponent;
  let fixture: ComponentFixture<ContainerTerminalComponent>;
  let terminalServiceMock: any;
  let authServiceMock: any;
  let mockWs: MockWebSocket;

  const mockEnabledStatus: TerminalStatus = {
    enabled: true,
    idle_timeout_seconds: 300,
    max_session_seconds: 3600,
    max_concurrent_sessions: 5,
    active_sessions_count: 1,
    record_sessions: true,
    allowed_shells: ['/bin/sh', '/bin/bash'],
  };

  beforeEach(async () => {
    mockWs = new MockWebSocket();
    terminalServiceMock = {
      getStatus: jest.fn().mockReturnValue(of(mockEnabledStatus)),
      getSessions: jest.fn().mockReturnValue(of({ sessions: [], total_count: 0 })),
      createWebSocket: jest.fn().mockReturnValue(mockWs),
    };

    authServiceMock = {
      hasRole: jest.fn().mockReturnValue(true),
      getToken: jest.fn().mockReturnValue('mock-token'),
    };

    await TestBed.configureTestingModule({
      imports: [ContainerTerminalComponent, NoopAnimationsModule],
      providers: [
        { provide: TerminalService, useValue: terminalServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContainerTerminalComponent);
    component = fixture.componentInstance;
    component.containerId = 'c1';
    component.containerName = 'dockpilot-redis';
  });

  afterEach(() => {
    component?.ngOnDestroy();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should show forbidden state for non-admin user', () => {
    authServiceMock.hasRole.mockReturnValue(false);
    fixture = TestBed.createComponent(ContainerTerminalComponent);
    component = fixture.componentInstance;
    component.containerId = 'c1';
    fixture.detectChanges();

    expect(component.isForbidden()).toBe(true);
    expect(component.loading()).toBe(false);
    expect(terminalServiceMock.getStatus).not.toHaveBeenCalled();
  });

  it('should show disabled state when terminal is disabled in config', () => {
    terminalServiceMock.getStatus.mockReturnValue(
      of({ ...mockEnabledStatus, enabled: false })
    );

    fixture.detectChanges();

    expect(component.isDisabled()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('should show disabled state when status returns 404', () => {
    terminalServiceMock.getStatus.mockReturnValue(
      throwError(() => ({ status: 404 }))
    );

    fixture.detectChanges();

    expect(component.isDisabled()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('should load status and display recording badge when record_sessions is true', () => {
    fixture.detectChanges();

    expect(component.terminalStatus()).toEqual(mockEnabledStatus);
    expect(component.isRecorded()).toBe(true);
    expect(component.allowedShells()).toEqual(['/bin/sh', '/bin/bash']);
  });

  it('should establish websocket connection when terminal initializes', () => {
    fixture.detectChanges();

    component.initTerminal();

    expect(terminalServiceMock.createWebSocket).toHaveBeenCalledWith('c1', '/bin/sh');
    expect(component.connectionState()).toBe('connecting');

    // Simulate open
    mockWs.onopen?.();
    expect(component.connectionState()).toBe('connected');
  });

  it('should handle disconnect event with timeout reason', () => {
    fixture.detectChanges();
    component.initTerminal();

    mockWs.onclose?.({ code: 4408, reason: 'Session closed due to inactivity timeout.' });

    expect(component.connectionState()).toBe('disconnected');
    expect(component.disconnectReason()).toContain('inactivity timeout');
  });

  it('should reconnect when shell selection is changed', () => {
    fixture.detectChanges();
    component.initTerminal();

    component.onShellChange('/bin/bash');

    expect(component.selectedShell()).toBe('/bin/bash');
    expect(terminalServiceMock.createWebSocket).toHaveBeenCalledWith('c1', '/bin/bash');
  });

  it('should cleanup resources on destroy', () => {
    fixture.detectChanges();
    component.initTerminal();

    component.ngOnDestroy();

    expect(mockWs.close).toHaveBeenCalled();
    expect(component.ws).toBeNull();
  });

  it('should reactively update terminal theme when activeTheme changes', () => {
    fixture.detectChanges();
    const mockTerm: any = {
      options: { theme: {} },
      dispose: jest.fn(),
      clear: jest.fn(),
    };
    component.terminal = mockTerm;

    const themeService = TestBed.inject(ThemeService);
    themeService.setMode('light');
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(component.terminal.options.theme).toEqual(TERMINAL_LIGHT_THEME);

    themeService.setMode('dark');
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(component.terminal.options.theme).toEqual(TERMINAL_DARK_THEME);
  });
});
