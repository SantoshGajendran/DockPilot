import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UsersService } from './users.service';
import { USERS_ENDPOINTS } from '../constants/user-mgmt.constants';
import { UserItem, UsersListResponse } from '../models/user-mgmt.model';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UsersService],
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list users with pagination and search', () => {
    const mockRes: UsersListResponse = {
      items: [
        {
          id: 'u1',
          username: 'admin',
          role: 'admin',
          is_active: true,
          force_password_change: false,
          totp_enabled: false,
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
    };

    service.listUsers(1, 20, 'admin').subscribe((res) => {
      expect(res.total).toBe(1);
      expect(res.items[0].username).toBe('admin');
    });

    const req = httpMock.expectOne((r) => r.url === USERS_ENDPOINTS.users);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('q')).toBe('admin');
    req.flush(mockRes);
  });

  it('should create user', () => {
    const newUser: UserItem = {
      id: 'u2',
      username: 'operator',
      role: 'operator',
      is_active: true,
      force_password_change: false,
      totp_enabled: false,
    };

    service
      .createUser({
        username: 'operator',
        password: 'Pass',
        role: 'operator',
        is_active: true,
        force_password_change: false,
      })
      .subscribe((res) => {
        expect(res.id).toBe('u2');
      });

    const req = httpMock.expectOne(USERS_ENDPOINTS.users);
    expect(req.request.method).toBe('POST');
    req.flush(newUser);
  });

  it('should update user', () => {
    const updated: UserItem = {
      id: 'u1',
      username: 'admin',
      role: 'admin',
      is_active: false,
      force_password_change: false,
      totp_enabled: false,
    };

    service.updateUser('u1', { is_active: false }).subscribe((res) => {
      expect(res.is_active).toBe(false);
    });

    const req = httpMock.expectOne(`${USERS_ENDPOINTS.users}/u1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  it('should delete user', () => {
    service.deleteUser('u1').subscribe();

    const req = httpMock.expectOne(`${USERS_ENDPOINTS.users}/u1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should reset user password', () => {
    service.resetPassword('u1', { new_password: 'NewPassword1!', force_password_change: true }).subscribe((res) => {
      expect(res.message).toBe('Password reset successfully');
    });

    const req = httpMock.expectOne(`${USERS_ENDPOINTS.users}/u1/reset-password`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Password reset successfully' });
  });
});
