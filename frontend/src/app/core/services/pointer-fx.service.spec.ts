import { TestBed } from '@angular/core/testing';
import { PointerFxService } from './pointer-fx.service';

describe('PointerFxService', () => {
  let service: PointerFxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PointerFxService);
  });

  afterEach(() => {
    service.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize and register pointermove listener', () => {
    const addEventSpy = jest.spyOn(document, 'addEventListener');
    service.init();
    expect(addEventSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true });
    addEventSpy.mockRestore();
  });

  it('should update --mx and --my CSS properties on pointer event', (done) => {
    service.init();
    const event = new MouseEvent('pointermove', {
      clientX: 250,
      clientY: 420
    });
    document.dispatchEvent(event);

    requestAnimationFrame(() => {
      expect(document.documentElement.style.getPropertyValue('--mx')).toBe('250px');
      expect(document.documentElement.style.getPropertyValue('--my')).toBe('420px');
      done();
    });
  });

  it('should not update CSS properties when quiet mode is enabled', (done) => {
    service.init();
    service.setQuietMode(true);
    document.documentElement.style.setProperty('--mx', '0px');
    document.documentElement.style.setProperty('--my', '0px');

    const event = new MouseEvent('pointermove', {
      clientX: 300,
      clientY: 500
    });
    document.dispatchEvent(event);

    requestAnimationFrame(() => {
      expect(document.documentElement.style.getPropertyValue('--mx')).toBe('0px');
      expect(document.documentElement.style.getPropertyValue('--my')).toBe('0px');
      done();
    });
  });
});
