import { Component, OnInit, OnDestroy, signal, inject, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { Subscription, interval, filter } from 'rxjs';

import { NAVIGATION_ITEMS, NAV_SECTIONS, NavItem, NavGroup } from '../core/config/navigation.config';
import { SseService } from '../core/services/sse.service';
import { AuthService } from '../core/services/auth.service';
import { AlertsService } from '../core/services/alerts.service';
import { ThemeService } from '../core/services/theme.service';
import { IconComponent } from '../shared/components/icon/icon.component';
import { CommandPaletteComponent } from '../shared/components/command-palette/command-palette.component';
import { ShortcutsOverlayComponent } from '../shared/components/shortcuts-overlay/shortcuts-overlay.component';

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
    MatMenuModule,
    IconComponent,
    CommandPaletteComponent,
    ShortcutsOverlayComponent
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit, OnDestroy {
  @ViewChild('commandPalette') commandPalette?: CommandPaletteComponent;
  @ViewChild('shortcutsOverlay') shortcutsOverlay?: ShortcutsOverlayComponent;

  readonly navItems: NavItem[] = NAVIGATION_ITEMS;
  readonly navSections = NAV_SECTIONS;
  readonly isCollapsed = signal<boolean>(false);
  readonly currentBreadcrumb = signal<string>('DOCKPILOT // OVERVIEW');

  readonly sseService = inject(SseService);
  readonly authService = inject(AuthService);
  readonly alertsService = inject(AlertsService, { optional: true });
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly activeAlertsCount = signal<number>(0);
  private alertPollSub: Subscription | null = null;
  private routerSub: Subscription | null = null;

  ngOnInit(): void {
    this.refreshAlertCount();
    this.alertPollSub = interval(15000).subscribe(() => this.refreshAlertCount());

    this.updateBreadcrumb(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateBreadcrumb(e.urlAfterRedirects || e.url));
  }

  ngOnDestroy(): void {
    this.alertPollSub?.unsubscribe();
    this.routerSub?.unsubscribe();
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

  canAccess(item: NavItem): boolean {
    if (!item.minRole) return true;
    return this.authService.hasRole(item.minRole);
  }

  getItemsForGroup(group: NavGroup): NavItem[] {
    return this.navItems.filter((item) => item.group === group);
  }

  openCommandPalette(): void {
    this.commandPalette?.open();
  }

  openShortcuts(): void {
    this.shortcutsOverlay?.open();
  }

  private updateBreadcrumb(url: string): void {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const match = this.navItems.find((i) => cleanUrl.startsWith(i.path));
    if (match) {
      this.currentBreadcrumb.set(`DOCKPILOT // ${match.label.toUpperCase()}`);
    } else if (cleanUrl.startsWith('/login')) {
      this.currentBreadcrumb.set('DOCKPILOT // AUTHENTICATION');
    } else if (cleanUrl.startsWith('/profile')) {
      this.currentBreadcrumb.set('DOCKPILOT // OPERATOR PROFILE');
    } else {
      this.currentBreadcrumb.set('DOCKPILOT // COMMAND DECK');
    }
  }
}
