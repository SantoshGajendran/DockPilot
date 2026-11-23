import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { PointerFxService } from './core/services/pointer-fx.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let pointerFxService: PointerFxService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    pointerFxService = TestBed.inject(PointerFxService);
    jest.spyOn(pointerFxService, 'init').mockImplementation(() => {});

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the root component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize PointerFxService on init', () => {
    expect(pointerFxService.init).toHaveBeenCalled();
  });

  it('should render ambient canvas, grain, vignette, and toast container', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('dp-ambient-canvas')).toBeTruthy();
    expect(el.querySelector('.film-grain')).toBeTruthy();
    expect(el.querySelector('.vignette-overlay')).toBeTruthy();
    expect(el.querySelector('dp-toast-container')).toBeTruthy();
  });
});
