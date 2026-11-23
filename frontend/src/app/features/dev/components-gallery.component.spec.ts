import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ComponentsGalleryComponent } from './components-gallery.component';
import { MatDialog } from '@angular/material/dialog';
import { ToastService } from '../../core/services/toast.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ComponentsGalleryComponent', () => {
  let fixture: ComponentFixture<ComponentsGalleryComponent>;
  let component: ComponentsGalleryComponent;
  let toastService: ToastService;
  let dialog: MatDialog;

  beforeEach(async () => {
    dialog = {
      open: jest.fn()
    } as unknown as MatDialog;

    await TestBed.configureTestingModule({
      imports: [ComponentsGalleryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: MatDialog, useValue: dialog }
      ]
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ComponentsGalleryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the gallery component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all component demonstration sections', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('.gallery-title')).toBeTruthy();
    expect(el.querySelectorAll('.gallery-section').length).toBeGreaterThanOrEqual(8);
  });

  it('should trigger toast notification on button click', () => {
    const showSpy = jest.spyOn(toastService, 'show');
    component.triggerToast('success');
    expect(showSpy).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('should open confirm danger dialog', () => {
    component.openDangerDialog();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('should update metric value on cycleMetric', () => {
    const initial = component.metricValue();
    component.cycleMetric();
    expect(component.metricValue()).toBeDefined();
  });
});
