import { Routes } from '@angular/router';
import { isDevMode } from '@angular/core';
import { ShellComponent } from './layout/shell.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'dev/components',
    canMatch: [() => isDevMode()],
    loadComponent: () =>
      import('./features/dev/components-gallery.component').then(
        (m) => m.ComponentsGalleryComponent
      ),
    data: { title: 'Flight Deck Component Gallery' },
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
    data: { title: 'Sign In' },
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        data: { title: 'Dashboard' },
      },
      {
        path: 'containers',
        loadComponent: () =>
          import('./features/containers/containers-list.component').then(
            (m) => m.ContainersListComponent
          ),
        data: { title: 'Containers' },
      },
      {
        path: 'containers/:id',
        loadComponent: () =>
          import('./features/containers/detail/container-detail.component').then(
            (m) => m.ContainerDetailComponent
          ),
        data: { title: 'Container Details' },
      },
      {
        path: 'logs',
        loadComponent: () =>
          import('./features/logs/logs-explorer.component').then(
            (m) => m.LogsExplorerComponent
          ),
        data: { title: 'Logs Explorer' },
      },
      {
        path: 'host',
        loadComponent: () =>
          import('./features/host/host.component').then(
            (m) => m.HostComponent
          ),
        data: { title: 'Host Server' },
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/compose/compose-projects.component').then(
            (m) => m.ComposeProjectsComponent
          ),
        data: { title: 'Compose Projects' },
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/events/events.component').then(
            (m) => m.EventsComponent
          ),
        data: { title: 'Events Timeline' },
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/alerts/alerts.component').then(
            (m) => m.AlertsComponent
          ),
        data: { title: 'Alerts & Rules' },
      },
      {
        path: 'alerts/channels',
        loadComponent: () =>
          import('./features/alerts/channels/notification-channels.component').then(
            (m) => m.NotificationChannelsComponent
          ),
        data: { title: 'Notification Channels' },
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./features/resources/resources.component').then(
            (m) => m.ResourcesComponent
          ),
        data: { title: 'Docker Resources' },
      },
      {
        path: 'audit',
        canActivate: [roleGuard],
        loadComponent: () =>
          import('./features/audit/audit.component').then(
            (m) => m.AuditComponent
          ),
        data: { title: 'Audit Log', role: 'admin' },
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        loadComponent: () =>
          import('./features/users/users.component').then(
            (m) => m.UsersComponent
          ),
        data: { title: 'Users & Roles', role: 'admin' },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
        data: { title: 'User Profile' },
      },
      {
        path: 'settings',
        canDeactivate: [pendingChangesGuard],
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
        data: { title: 'Settings' },
      },



    ],
  },
];
