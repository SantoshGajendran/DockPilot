import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should add toast on show() and remove on dismiss()', () => {
    service.show('Test message', 'info', 0);
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Test message');

    const id = service.toasts()[0].id;
    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
  });

  it('should support severity shortcuts', () => {
    service.error('Failed');
    service.success('Saved');
    service.warning('Degraded');

    expect(service.toasts().length).toBe(3);
    expect(service.toasts()[0].severity).toBe('error');
    expect(service.toasts()[1].severity).toBe('success');
    expect(service.toasts()[2].severity).toBe('warning');
  });
});
