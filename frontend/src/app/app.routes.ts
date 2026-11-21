import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
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


    ],
  },
];
