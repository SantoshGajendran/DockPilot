import { TestBed } from '@angular/core/testing';
import { AtmosphereService } from './atmosphere.service';

describe('AtmosphereService', () => {
  let service: AtmosphereService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AtmosphereService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created with default healthy energy', () => {
    expect(service).toBeTruthy();
    expect(service.energy()).toBe('healthy');
  });

  it('should toggle and persist quiet mode', () => {
    expect(service.quietMode()).toBe(false);
    service.toggleQuietMode();
    expect(service.quietMode()).toBe(true);
    expect(localStorage.getItem('dockpilot_quiet_mode')).toBe('true');

    service.setQuietMode(false);
    expect(service.quietMode()).toBe(false);
    expect(localStorage.getItem('dockpilot_quiet_mode')).toBe('false');
  });

  it('should update energy state', () => {
    service.setEnergy('warning');
    expect(service.energy()).toBe('warning');

    service.setEnergy('critical');
    expect(service.energy()).toBe('critical');
  });
});
