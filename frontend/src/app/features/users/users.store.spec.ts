import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UsersStore } from './users.store';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { UserItem, UsersListResponse } from '../../core/models/user-mgmt.model';

describe('UsersStore', () => {
  let store: UsersStore;
  let usersServiceMock: any;
  let toastMock: any;

  const mockUsers: UserItem[] = [
    {
      id: 'u1',
      username: 'admin',
      role: 'admin',
      is_active: true,
      force_password_change: false,
      totp_enabled: false,
    },
  ];

  const mockResponse: UsersListResponse = {
    items: mockUsers,
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };

  beforeEach(() => {
    usersServiceMock = {
      listUsers: jest.fn().mockReturnValue(of(mockResponse)),
      createUser: jest.fn().mockReturnValue(of(mockUsers[0])),
      updateUser: jest.fn().mockReturnValue(of(mockUsers[0])),
      deleteUser: jest.fn().mockReturnValue(of(undefined)),
      resetPassword: jest.fn().mockReturnValue(of({ message: 'Success' })),
    };
    toastMock = {
      show: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UsersStore,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    store = TestBed.inject(UsersStore);
  });

  it('should load users on init', () => {
    store.init();
    expect(usersServiceMock.listUsers).toHaveBeenCalled();
    expect(store.users().length).toBe(1);
    expect(store.total()).toBe(1);
  });

  it('should handle load error', () => {
    usersServiceMock.listUsers.mockReturnValue(throwError(() => new Error('Error')));
    store.loadUsers();
    expect(store.error()).toBe('Error');
  });

  it('should create user and reload', () => {
    const cb = jest.fn();
    store.createUser(
      { username: 'test', password: '123', role: 'viewer', is_active: true, force_password_change: false },
      cb
    );
    expect(usersServiceMock.createUser).toHaveBeenCalled();
    expect(toastMock.show).toHaveBeenCalled();
    expect(cb).toHaveBeenCalled();
  });

  it('should toggle user active status', () => {
    store.toggleActive(mockUsers[0]);
    expect(usersServiceMock.updateUser).toHaveBeenCalledWith('u1', { is_active: false });
  });

  it('should delete user and show toast', () => {
    const cb = jest.fn();
    store.deleteUser('u1', 'admin', cb);
    expect(usersServiceMock.deleteUser).toHaveBeenCalledWith('u1');
    expect(cb).toHaveBeenCalled();
  });

  it('should reset password', () => {
    const cb = jest.fn();
    store.resetPassword('u1', { new_password: 'new', force_password_change: true }, cb);
    expect(usersServiceMock.resetPassword).toHaveBeenCalledWith('u1', { new_password: 'new', force_password_change: true });
    expect(cb).toHaveBeenCalled();
  });
});
