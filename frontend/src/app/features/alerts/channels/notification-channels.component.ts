import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { NotificationsStore } from '../notifications.store';
import { AuthService } from '../../../core/services/auth.service';
import {
  NotificationChannel,
  NotificationRoute,
} from '../../../core/models/notifications.model';
import { CHANNEL_TYPES } from '../../../core/constants/notifications.constants';
import { ChannelDialogComponent } from '../dialogs/channel-dialog.component';
import { RouteDialogComponent } from '../dialogs/route-dialog.component';

@Component({
  selector: 'dp-notification-channels',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    MatTabsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  providers: [NotificationsStore],
  templateUrl: './notification-channels.component.html',
  styleUrls: ['./notification-channels.component.scss'],
})
export class NotificationChannelsComponent implements OnInit {
  readonly store = inject(NotificationsStore);
  readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly routeColumns: string[] = [
    'enabled',
    'name',
    'channel',
    'severity',
    'rule_type',
    'scope',
    'actions',
  ];

  readonly logColumns: string[] = [
    'created_at',
    'channel',
    'alert_title',
    'severity',
    'status',
    'attempts',
    'error',
  ];

  ngOnInit(): void {
    this.store.init();
  }

  get isAdmin(): boolean {
    return this.authService.hasRole('admin');
  }

  get isOperator(): boolean {
    return this.authService.hasRole('operator');
  }

  getTypeIcon(type: string): string {
    const meta = CHANNEL_TYPES.find((t) => t.type === type);
    return meta?.icon || 'notifications';
  }

  openAddChannelDialog(): void {
    const ref = this.dialog.open(ChannelDialogComponent, {
      width: '560px',
      data: {},
    });
    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.store.createChannel(res, () => {
          this.snackBar.open('Notification channel created', 'Close', { duration: 3000 });
        });
      }
    });
  }

  openEditChannelDialog(channel: NotificationChannel): void {
    const ref = this.dialog.open(ChannelDialogComponent, {
      width: '560px',
      data: { channel },
    });
    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.store.updateChannel(channel.id, res, () => {
          this.snackBar.open('Channel updated', 'Close', { duration: 3000 });
        });
      }
    });
  }

  deleteChannel(channel: NotificationChannel): void {
    if (confirm(`Delete notification channel "${channel.name}"?`)) {
      this.store.deleteChannel(channel.id);
      this.snackBar.open('Channel deleted', 'Close', { duration: 3000 });
    }
  }

  toggleChannel(channel: NotificationChannel): void {
    this.store.updateChannel(channel.id, { enabled: !channel.enabled });
  }

  openAddRouteDialog(): void {
    const ref = this.dialog.open(RouteDialogComponent, {
      width: '520px',
      data: { channels: this.store.channels() },
    });
    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.store.createRoute(res, () => {
          this.snackBar.open('Routing rule created', 'Close', { duration: 3000 });
        });
      }
    });
  }

  openEditRouteDialog(route: NotificationRoute): void {
    const ref = this.dialog.open(RouteDialogComponent, {
      width: '520px',
      data: { route, channels: this.store.channels() },
    });
    ref.afterClosed().subscribe((res) => {
      if (res) {
        this.store.updateRoute(route.id, res, () => {
          this.snackBar.open('Route updated', 'Close', { duration: 3000 });
        });
      }
    });
  }

  deleteRoute(route: NotificationRoute): void {
    if (confirm(`Delete routing rule "${route.name}"?`)) {
      this.store.deleteRoute(route.id);
      this.snackBar.open('Route deleted', 'Close', { duration: 3000 });
    }
  }

  toggleRoute(route: NotificationRoute): void {
    this.store.updateRoute(route.id, { enabled: !route.enabled });
  }
}
