import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ResourcesComponent } from './resources.component';
import { ResourcesStore } from './resources.store';
import { AuthService } from '../../core/services/auth.service';
import { ResourcesService } from '../../core/services/resources.service';

describe('ResourcesComponent', () => {
  let component: ResourcesComponent;
  let fixture: ComponentFixture<ResourcesComponent>;
  let authServiceMock: { hasRole: jest.Mock };
  let dialogMock: { open: jest.Mock };
  let snackBarMock: { open: jest.Mock };
  let resourcesServiceMock: jest.Mocked<Partial<ResourcesService>>;

  beforeEach(async () => {
    authServiceMock = {
      hasRole: jest.fn().mockReturnValue(true),
    };

    dialogMock = {
      open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }),
    };

    snackBarMock = {
      open: jest.fn(),
    };

    resourcesServiceMock = {
      getImages: jest.fn().mockReturnValue(of({ images: [], total_size: 0, total_count: 0 })),
      getVolumes: jest.fn().mockReturnValue(of({ volumes: [], total_count: 0 })),
      getNetworks: jest.fn().mockReturnValue(of({ networks: [], total_count: 0 })),
      removeImage: jest.fn().mockReturnValue(of({ ok: true, message: 'Deleted' })),
      removeVolume: jest.fn().mockReturnValue(of({ ok: true, message: 'Deleted' })),
      removeNetwork: jest.fn().mockReturnValue(of({ ok: true, message: 'Deleted' })),
    };

    await TestBed.configureTestingModule({
      imports: [ResourcesComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: ResourcesService, useValue: resourcesServiceMock },
      ],
    })
      .overrideComponent(ResourcesComponent, {
        set: {
          providers: [
            ResourcesStore,
            { provide: MatDialog, useValue: dialogMock },
            { provide: MatSnackBar, useValue: snackBarMock },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ResourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize resources', () => {
    expect(component).toBeTruthy();
    expect(resourcesServiceMock.getImages).toHaveBeenCalled();
    expect(resourcesServiceMock.getVolumes).toHaveBeenCalled();
    expect(resourcesServiceMock.getNetworks).toHaveBeenCalled();
  });

  it('should switch active tabs', () => {
    component.onTabChange(1);
    expect(component.store.activeTab()).toBe('volumes');

    component.onTabChange(2);
    expect(component.store.activeTab()).toBe('networks');
  });

  it('should open pull image dialog and refresh on close', () => {
    component.openPullDialog();
    expect(dialogMock.open).toHaveBeenCalled();
    expect(snackBarMock.open).toHaveBeenCalledWith('Image pulled successfully', 'Close', expect.any(Object));
  });

  it('should open prune wizard dialog and refresh on close', () => {
    component.openPruneWizard();
    expect(dialogMock.open).toHaveBeenCalled();
    expect(snackBarMock.open).toHaveBeenCalledWith('Prune completed successfully', 'Close', expect.any(Object));
  });

  it('should trigger delete image when confirmed', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteSpy = jest.spyOn(component.store, 'deleteImage');

    component.deleteImage('img-123', 'redis:latest');
    expect(deleteSpy).toHaveBeenCalledWith('img-123', expect.any(Function));
  });

  it('should trigger delete volume when confirmed', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteSpy = jest.spyOn(component.store, 'deleteVolume');

    component.deleteVolume('vol-data');
    expect(deleteSpy).toHaveBeenCalledWith('vol-data', expect.any(Function));
  });

  it('should trigger delete network when confirmed', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteSpy = jest.spyOn(component.store, 'deleteNetwork');

    component.deleteNetwork('net-123', 'custom-net');
    expect(deleteSpy).toHaveBeenCalledWith('net-123', expect.any(Function));
  });
});
