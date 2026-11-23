import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommandPaletteComponent } from './command-palette.component';
import { AuthService } from '../../../core/services/auth.service';

describe('CommandPaletteComponent', () => {
  let component: CommandPaletteComponent;
  let fixture: ComponentFixture<CommandPaletteComponent>;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      hasRole: jest.fn().mockReturnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandPaletteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created and closed by default', () => {
    expect(component).toBeTruthy();
    expect(component.isOpen()).toBe(false);
  });

  it('should open and close on open() and close()', () => {
    component.open();
    expect(component.isOpen()).toBe(true);

    component.close();
    expect(component.isOpen()).toBe(false);
  });

  it('should toggle on Ctrl+K shortcut', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    window.dispatchEvent(event);
    expect(component.isOpen()).toBe(true);

    window.dispatchEvent(event);
    expect(component.isOpen()).toBe(false);
  });

  it('should filter items based on query', () => {
    component.open();
    component.query = 'Containers';
    component.onQueryChange();

    expect(component.filteredActions().length).toBeGreaterThan(0);
    expect(component.filteredActions()[0].title).toContain('Containers');
  });
});
