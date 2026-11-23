import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TerminalViewComponent, TERMINAL_DARK_THEME, TERMINAL_LIGHT_THEME } from './terminal-view.component';
import { ThemeService } from '../../core/services/theme.service';

describe('TerminalViewComponent', () => {
  let component: TerminalViewComponent;
  let fixture: ComponentFixture<TerminalViewComponent>;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TerminalViewComponent],
      providers: [ThemeService],
    }).compileComponents();

    fixture = TestBed.createComponent(TerminalViewComponent);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    component.ngOnDestroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.themeService).toBeTruthy();
  });

  it('should reactively update term theme when activeTheme changes', () => {
    // Provide a mock term object
    const mockTerm: any = {
      options: {
        theme: {},
      },
      dispose: jest.fn(),
      write: jest.fn(),
      clear: jest.fn(),
    };
    component.term = mockTerm;

    themeService.setMode('light');
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(component.term.options.theme).toEqual(TERMINAL_LIGHT_THEME);
    expect(component.term.options.theme.background).toBe('#f8fafc');
    expect(component.term.options.theme.foreground).toBe('#0f172a');
    expect(component.term.options.theme.cursor).toBe('#2563eb');

    themeService.setMode('dark');
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(component.term.options.theme).toEqual(TERMINAL_DARK_THEME);
    expect(component.term.options.theme.background).toBe('#080c14');
    expect(component.term.options.theme.foreground).toBe('#f8fafc');
    expect(component.term.options.theme.cursor).toBe('#3b82f6');
  });

  it('should safely handle write, clear and fit without term or addon throwing', () => {
    expect(() => component.write('test')).not.toThrow();
    expect(() => component.clear()).not.toThrow();
    expect(() => component.fit()).not.toThrow();
  });
});
