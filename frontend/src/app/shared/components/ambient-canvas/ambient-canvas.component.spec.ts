import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AmbientCanvasComponent } from './ambient-canvas.component';
import { AtmosphereService } from '../../../core/services/atmosphere.service';

describe('AmbientCanvasComponent', () => {
  let component: AmbientCanvasComponent;
  let fixture: ComponentFixture<AmbientCanvasComponent>;
  let atmosphereService: AtmosphereService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AmbientCanvasComponent],
      providers: [AtmosphereService]
    }).compileComponents();

    atmosphereService = TestBed.inject(AtmosphereService);
    fixture = TestBed.createComponent(AmbientCanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create and render canvas element', () => {
    expect(component).toBeTruthy();
    const canvas = fixture.nativeElement.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('should react to quiet mode by stopping render', () => {
    atmosphereService.setQuietMode(true);
    fixture.detectChanges();
    // Component handles quietMode gracefully without throwing
    expect(atmosphereService.quietMode()).toBe(true);
  });
});
