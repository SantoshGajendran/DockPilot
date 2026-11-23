import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProfileStore } from './profile.store';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';

describe('ProfileStore', () => {
  let store: ProfileStore;
  let profileServiceMock: any;
  let toastMock: any;
  let authServiceMock: any;

  beforeEach(() => {
    profileServiceMock = {
      listSessions: jest.fn().mockReturnValue(of({ items: [{ id: 's1', is_current: true }], total: 1 })),
      revokeSession: jest.fn().mockReturnValue(of({ message: 'Success' })),
      revokeAllSessions: jest.fn().mockReturnValue(of({ message: 'Success' })),
      enrolTotp: jest.fn().mockReturnValue(of({ secret: 'S', otpauth_url: 'uri' })),
      verifyTotp: jest.fn().mockReturnValue(of({ message: 'Success' })),
      disableTotp: jest.fn().mockReturnValue(of({ message: 'Success' })),
      changePassword: jest.fn().mockReturnValue(of({ message: 'Success' })),
    };
    toastMock = { show: jest.fn() };
    authServiceMock = { refreshSession: jest.fn().mockReturnValue(of(null)) };

    TestBed.configureTestingModule({
      providers: [
        ProfileStore,
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    store = TestBed.inject(ProfileStore);
  });

  it('should load sessions on init', () => {
    store.init();
    expect(profileServiceMock.listSessions).toHaveBeenCalled();
    expect(store.sessions().length).toBe(1);
  });

  it('should revoke single session', () => {
    store.revokeSession('s1');
    expect(profileServiceMock.revokeSession).toHaveBeenCalledWith('s1');
    expect(toastMock.show).toHaveBeenCalledWith('Session revoked');
  });

  it('should revoke all other sessions', () => {
    store.revokeAllSessions();
    expect(profileServiceMock.revokeAllSessions).toHaveBeenCalled();
  });

  it('should start and verify TOTP enrolment', () => {
    store.startTotpEnrol();
    expect(profileServiceMock.enrolTotp).toHaveBeenCalled();
    expect(store.totpEnrolData()?.secret).toBe('S');

    const cb = jest.fn();
    store.verifyTotp('123456', cb);
    expect(profileServiceMock.verifyTotp).toHaveBeenCalledWith('123456');
    expect(cb).toHaveBeenCalled();
    expect(store.totpEnrolData()).toBeNull();
  });

  it('should change password', () => {
    const cb = jest.fn();
    store.changePassword({ current_password: 'old', new_password: 'new' }, cb);
    expect(profileServiceMock.changePassword).toHaveBeenCalled();
    expect(cb).toHaveBeenCalled();
  });
});
