import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { SessionExpiredDialogComponent } from './session-expired-dialog.component';

describe('SessionExpiredDialogComponent', () => {
  let component: SessionExpiredDialogComponent;
  let fixture: ComponentFixture<SessionExpiredDialogComponent>;
  let mockDialogRef: { close: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn()
    };
    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SessionExpiredDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SessionExpiredDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and display session expired message', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Session Expired');
    expect(compiled.textContent).toContain('Your session has expired due to inactivity. Please log in again to continue.');
    expect(compiled.querySelector('button')?.textContent).toContain('Log In');
  });

  it('should close dialog and navigate to /login when Log In button clicked', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(mockDialogRef.close).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
