import { Injectable, inject, signal } from '@angular/core';
import {
  AdminPasswordResetRequest,
  UserCreateRequest,
  UserItem,
  UserUpdateRequest,
} from '../../core/models/user-mgmt.model';
import { UsersService } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';

@Injectable()
export class UsersStore {
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);

  readonly users = signal<UserItem[]>([]);
  readonly total = signal<number>(0);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly totalPages = signal<number>(1);
  readonly searchQuery = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly selectedUser = signal<UserItem | null>(null);

  init(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.usersService
      .listUsers(this.page(), this.pageSize(), this.searchQuery())
      .subscribe({
        next: (resp) => {
          this.users.set(resp.items);
          this.total.set(resp.total);
          this.page.set(resp.page);
          this.pageSize.set(resp.page_size);
          this.totalPages.set(resp.total_pages);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.detail || err?.message || 'Failed to load users');
          this.isLoading.set(false);
        },
      });
  }

  setPage(page: number): void {
    this.page.set(page);
    this.loadUsers();
  }

  setSearch(q: string): void {
    this.searchQuery.set(q);
    this.page.set(1);
    this.loadUsers();
  }

  createUser(data: UserCreateRequest, onSuccess?: () => void): void {
    this.usersService.createUser(data).subscribe({
      next: (user) => {
        this.toast.show(`User '${user.username}' created successfully`);
        this.loadUsers();
        onSuccess?.();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to create user');
      },
    });
  }

  updateUser(id: string, data: UserUpdateRequest, onSuccess?: () => void): void {
    this.usersService.updateUser(id, data).subscribe({
      next: (user) => {
        this.toast.show(`User '${user.username}' updated successfully`);
        this.loadUsers();
        onSuccess?.();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to update user');
      },
    });
  }

  toggleActive(user: UserItem): void {
    const nextState = !user.is_active;
    this.usersService.updateUser(user.id, { is_active: nextState }).subscribe({
      next: () => {
        this.toast.show(`User '${user.username}' ${nextState ? 'enabled' : 'disabled'}`);
        this.loadUsers();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to update user state');
      },
    });
  }

  deleteUser(id: string, username: string, onSuccess?: () => void): void {
    this.usersService.deleteUser(id).subscribe({
      next: () => {
        this.toast.show(`User '${username}' deleted successfully`);
        this.loadUsers();
        onSuccess?.();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to delete user');
      },
    });
  }

  resetPassword(id: string, data: AdminPasswordResetRequest, onSuccess?: () => void): void {
    this.usersService.resetPassword(id, data).subscribe({
      next: (res) => {
        this.toast.show(res.message || 'Password reset successfully');
        this.loadUsers();
        onSuccess?.();
      },
      error: (err) => {
        this.toast.show(err?.error?.detail || err?.message || 'Failed to reset password');
      },
    });
  }
}
