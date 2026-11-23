import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ProfileComponent } from './profile.component';
import { ProfileStore } from './profile.store';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserSessionItem, TotpEnrolResponse } from '../../core/models/user-mgmt.model';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let profileServiceMock: any;
  let authServiceMock: any;
  let toastServiceMock: any;

  const mockSession: UserSessionItem = {
    id: 's1',
    user_id: 'u1',
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0 Chrome',
    created_at: '2026-11-23T10:00:00Z',
    last_seen_at: '2026-11-23T10:30:00Z',
    is_current: true,
  };

  const mockEnrol: TotpEnrolResponse = {
    secret: 'JBSWY3DPEHPK3PXP',
    otpauth_url: 'otpauth://totp/DockPilot:admin?secret=JBSWY3DPEHPK3PXP&issuer=DockPilot',
  };

  beforeEach(async () => {
    profileServiceMock = {
      listSessions: jest.fn().mockReturnValue(of({ items: [mockSession], total: 1 })),
      revokeSession: jest.fn().mockReturnValue(of({ message: 'Session revoked' })),
      revokeAllSessions: jest.fn().mockReturnValue(of({ message: 'All sessions revoked' })),
      changePassword: jest.fn().mockReturnValue(of({ message: 'Password updated' })),
      enrolTotp: jest.fn().mockReturnValue(of(mockEnrol)),
      verifyTotp: jest.fn().mockReturnValue(of({ message: '2FA activated' })),
      disableTotp: jest.fn().mockReturnValue(of({ message: '2FA disabled' })),
    };

    authServiceMock = {
      currentUser: signal({
        id: 'u1',
        username: 'admin',
        email: 'admin@dockpilot.local',
        role: 'admin',
        totp_enabled: false,
      }),
      fetchCurrentUser: jest.fn().mockReturnValue(of(null)),
    };

    toastServiceMock = {
      show: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, NoopAnimationsModule],
      providers: [
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    })
      .overrideComponent(ProfileComponent, {
        set: {
          providers: [ProfileStore],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load active sessions', () => {
    expect(component).toBeTruthy();
    expect(profileServiceMock.listSessions).toHaveBeenCalled();
    expect(component.store.sessions().length).toBe(1);
  });

  it('should validate and change password', () => {
    component.passwordForm.setValue({
      current_password: 'oldpassword',
      new_password: 'newpassword123',
      confirm_password: 'newpassword123',
    });

    component.changePassword();
    expect(profileServiceMock.changePassword).toHaveBeenCalledWith({
      current_password: 'oldpassword',
      new_password: 'newpassword123',
    });
  });

  it('should reject mismatched passwords', () => {
    component.passwordForm.setValue({
      current_password: 'oldpassword',
      new_password: 'newpassword123',
      confirm_password: 'differentpassword',
    });

    component.changePassword();
    expect(profileServiceMock.changePassword).not.toHaveBeenCalled();
    expect(toastServiceMock.show).toHaveBeenCalledWith('New passwords do not match');
  });

  it('should initiate TOTP enrolment', () => {
    component.startTotp();
    expect(profileServiceMock.enrolTotp).toHaveBeenCalled();
    expect(component.store.totpEnrolData()).toEqual(mockEnrol);
  });

  it('should verify TOTP code', () => {
    component.totpCodeControl.setValue('123456');
    component.verifyTotp();
    expect(profileServiceMock.verifyTotp).toHaveBeenCalledWith('123456');
  });

  it('should format relative timestamps properly', () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    expect(component.formatTimeAgo(recent)).toMatch(/\d+s ago/);

    const minutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(component.formatTimeAgo(minutesAgo)).toBe('5m ago');

    const hoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    expect(component.formatTimeAgo(hoursAgo)).toBe('2h ago');
  });
});
