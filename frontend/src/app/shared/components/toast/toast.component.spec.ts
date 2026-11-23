import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';
import { ToastService } from '../../../core/services/toast.service';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [ToastService]
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render active toasts from toast service', () => {
    toastService.success('Containers refreshed', 0);
    fixture.detectChanges();

    const toastEl = fixture.nativeElement.querySelector('.toast-item');
    expect(toastEl).toBeTruthy();
    expect(toastEl.textContent.trim()).toContain('Containers refreshed');
  });

  it('should dismiss toast on close click', () => {
    toastService.info('Operation queued', 0);
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.toast-close') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    fixture.detectChanges();

    expect(toastService.toasts().length).toBe(0);
  });
});
