import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';

import { UsersComponent } from './users.component';
import { UsersStore } from './users.store';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { UserItem, UsersListResponse } from '../../core/models/user-mgmt.model';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let usersServiceMock: any;
  let dialogMock: any;

  const mockUsers: UserItem[] = [
    {
      id: 'u1',
      username: 'admin',
      email: 'admin@dockpilot.local',
      role: 'admin',
      is_active: true,
      force_password_change: false,
      totp_enabled: true,
      created_at: '2026-11-23T10:00:00Z',
    },
  ];

  const mockResponse: UsersListResponse = {
    items: mockUsers,
    total: 1,
    page: 1,
    page_size: 20,
    total_pages: 1,
  };

  beforeEach(async () => {
    usersServiceMock = {
      listUsers: jest.fn().mockReturnValue(of(mockResponse)),
      createUser: jest.fn().mockReturnValue(of(mockUsers[0])),
      updateUser: jest.fn().mockReturnValue(of(mockUsers[0])),
      deleteUser: jest.fn().mockReturnValue(of(undefined)),
      resetPassword: jest.fn().mockReturnValue(of({ message: 'Success' })),
    };
    dialogMock = {
      open: jest.fn().mockReturnValue({
        afterClosed: () => of(null),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [UsersComponent, NoopAnimationsModule],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        { provide: ToastService, useValue: { show: jest.fn() } },
        { provide: MatDialog, useValue: dialogMock },
      ],
    })
      .overrideComponent(UsersComponent, {
        set: {
          providers: [
            UsersStore,
            { provide: MatDialog, useValue: dialogMock },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load users', () => {
    expect(component).toBeTruthy();
    expect(usersServiceMock.listUsers).toHaveBeenCalled();
    expect(component.store.users().length).toBe(1);
  });

  it('should apply and clear search', () => {
    component.searchQuery = 'admin';
    component.applySearch();
    expect(component.store.searchQuery()).toBe('admin');

    component.clearSearch();
    expect(component.searchQuery).toBe('');
    expect(component.store.searchQuery()).toBe('');
  });

  it('should open create dialog', () => {
    component.openCreateDialog();
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('should open edit dialog', () => {
    component.openEditDialog(mockUsers[0]);
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('should open reset password dialog', () => {
    component.openResetPasswordDialog(mockUsers[0]);
    expect(dialogMock.open).toHaveBeenCalled();
  });

  it('should format dates safely', () => {
    expect(component.formatDate('')).toBe('—');
    expect(component.formatDate('2026-11-23T10:00:00Z')).toBeTruthy();
  });

  it('should have aria-label on user table action buttons', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.actions-cell button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn: HTMLButtonElement) => expect(btn.getAttribute('aria-label')).toBeTruthy());
  });
});
