import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./layout/placeholder.component').then(
            (m) => m.PlaceholderComponent
          ),
        data: { title: 'Dashboard' },
      },
    ],
  },
];
