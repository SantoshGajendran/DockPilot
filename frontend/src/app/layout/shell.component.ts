import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { NAVIGATION_ITEMS, NavItem } from '../core/config/navigation.config';
import { SseService } from '../core/services/sse.service';
import { AuthService } from '../core/services/auth.service';

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
    MatChipsModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent {
  readonly navItems: NavItem[] = NAVIGATION_ITEMS;
  readonly isCollapsed = signal<boolean>(false);
  readonly sseService = inject(SseService);
  readonly authService = inject(AuthService);

  toggleSidebar(): void {
    this.isCollapsed.update(state => !state);
  }
}
