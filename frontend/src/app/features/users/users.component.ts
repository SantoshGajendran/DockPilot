import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UsersStore } from './users.store';
import { UserItem } from '../../core/models/user-mgmt.model';
import { getRoleMeta, RoleMeta } from '../../core/constants/user-mgmt.constants';
import { UserDialogComponent } from './dialogs/user-dialog.component';
import { ResetPasswordDialogComponent } from './dialogs/reset-password-dialog.component';

@Component({
  selector: 'dp-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  providers: [UsersStore],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  readonly store = inject(UsersStore);
  private readonly dialog = inject(MatDialog);

  readonly displayedColumns: string[] = [
    'username',
    'email',
    'role',
    'status',
    'totp',
    'force_pwd',
    'created_at',
    'actions',
  ];

  searchQuery = '';

  ngOnInit(): void {
    this.store.init();
  }

  applySearch(): void {
    this.store.setSearch(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.store.setSearch('');
  }

  onPageChange(event: PageEvent): void {
    this.store.setPage(event.pageIndex + 1);
  }

  getRoleMeta(role: string): RoleMeta {
    return getRoleMeta(role);
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(UserDialogComponent, {
      width: '450px',
      data: {},
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.store.createUser(res);
      }
    });
  }

  openEditDialog(user: UserItem): void {
    const ref = this.dialog.open(UserDialogComponent, {
      width: '450px',
      data: { user },
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.store.updateUser(user.id, {
          role: res.role,
          email: res.email || undefined,
          is_active: res.is_active,
          force_password_change: res.force_password_change,
        });
      }
    });
  }

  openResetPasswordDialog(user: UserItem): void {
    const ref = this.dialog.open(ResetPasswordDialogComponent, {
      width: '450px',
      data: { user },
    });

    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.store.resetPassword(user.id, res);
      }
    });
  }

  confirmDelete(user: UserItem): void {
    if (confirm(`Are you sure you want to delete user '${user.username}'? This action cannot be undone.`)) {
      this.store.deleteUser(user.id, user.username);
    }
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
