import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, interval } from 'rxjs';

import { NAVIGATION_ITEMS, NavItem } from '../core/config/navigation.config';
import { SseService } from '../core/services/sse.service';
import { AuthService } from '../core/services/auth.service';
import { AlertsService } from '../core/services/alerts.service';

@Component({
  selector: 'dp-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly navItems: NavItem[] = NAVIGATION_ITEMS;
  readonly isCollapsed = signal<boolean>(false);
  readonly sseService = inject(SseService);
  readonly authService = inject(AuthService);
  readonly alertsService = inject(AlertsService, { optional: true });

  readonly activeAlertsCount = signal<number>(0);
  private alertPollSub: Subscription | null = null;

  ngOnInit(): void {
    this.refreshAlertCount();
    this.alertPollSub = interval(15000).subscribe(() => this.refreshAlertCount());
  }

  ngOnDestroy(): void {
    this.alertPollSub?.unsubscribe();
  }

  refreshAlertCount(): void {
    if (!this.alertsService) return;
    this.alertsService.getActiveCount().subscribe({
      next: (res) => this.activeAlertsCount.set(res.active_count),
      error: () => {},
    });
  }

  toggleSidebar(): void {
    this.isCollapsed.update((state) => !state);
  }
}
