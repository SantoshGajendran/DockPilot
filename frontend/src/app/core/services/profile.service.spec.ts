import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';
import { USERS_ENDPOINTS } from '../constants/user-mgmt.constants';
import { TotpEnrolResponse, UserSessionsListResponse } from '../models/user-mgmt.model';

describe('ProfileService', () => {
  let service: ProfileService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProfileService],
    });

    service = TestBed.inject(ProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should change password', () => {
    service.changePassword({ current_password: 'old', new_password: 'new' }).subscribe((res) => {
      expect(res.message).toBe('Password changed successfully');
    });

    const req = httpMock.expectOne(USERS_ENDPOINTS.changePassword);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Password changed successfully' });
  });

  it('should enrol TOTP', () => {
    const mockEnrol: TotpEnrolResponse = {
      secret: 'SECRET123',
      otpauth_url: 'otpauth://totp/DockPilot:admin?secret=SECRET123',
    };

    service.enrolTotp().subscribe((res) => {
      expect(res.secret).toBe('SECRET123');
    });

    const req = httpMock.expectOne(USERS_ENDPOINTS.totpEnrol);
    expect(req.request.method).toBe('POST');
    req.flush(mockEnrol);
  });

  it('should verify TOTP code', () => {
    service.verifyTotp('123456').subscribe((res) => {
      expect(res.message).toBe('Two-factor authentication enabled successfully');
    });

    const req = httpMock.expectOne(USERS_ENDPOINTS.totpVerify);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: '123456' });
    req.flush({ message: 'Two-factor authentication enabled successfully' });
  });

  it('should disable TOTP', () => {
    service.disableTotp().subscribe();

    const req = httpMock.expectOne(USERS_ENDPOINTS.totpDisable);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Two-factor authentication disabled' });
  });

  it('should list sessions and revoke', () => {
    const mockSessions: UserSessionsListResponse = {
      items: [
        {
          id: 's1',
          created_at: '2026-11-23T10:00:00Z',
          last_seen_at: '2026-11-23T10:05:00Z',
          ip_address: '127.0.0.1',
          is_current: true,
        },
      ],
      total: 1,
    };

    service.listSessions().subscribe((res) => {
      expect(res.total).toBe(1);
    });

    const req = httpMock.expectOne(USERS_ENDPOINTS.sessions);
    expect(req.request.method).toBe('GET');
    req.flush(mockSessions);

    service.revokeSession('s1').subscribe();
    const revReq = httpMock.expectOne(`${USERS_ENDPOINTS.sessions}/s1/revoke`);
    expect(revReq.request.method).toBe('POST');
    revReq.flush({ message: 'Session revoked' });

    service.revokeAllSessions().subscribe();
    const revAllReq = httpMock.expectOne(USERS_ENDPOINTS.revokeAll);
    expect(revAllReq.request.method).toBe('POST');
    revAllReq.flush({ message: 'All other sessions revoked' });
  });
});
