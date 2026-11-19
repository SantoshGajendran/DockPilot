import { TestBed } from '@angular/core/testing';
import { SseService } from './sse.service';

describe('SseService', () => {
  let service: SseService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SseService] });
    service = TestBed.inject(SseService);
  });

  it('should initialize in disconnected state', () => {
    expect(service.connectionState()).toBe('disconnected');
  });

  it('should compute exponential backoff delay within boundaries', () => {
    const delay1 = service.computeBackoffDelay(1);
    const delay2 = service.computeBackoffDelay(2);
    expect(delay1).toBeGreaterThanOrEqual(1000);
    expect(delay2).toBeGreaterThanOrEqual(delay1);
    expect(service.computeBackoffDelay(20)).toBeLessThanOrEqual(30000);
  });
});
