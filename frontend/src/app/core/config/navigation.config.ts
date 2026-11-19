import { UserRole } from '../models/user.model';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  minRole?: UserRole;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { path: '/containers', label: 'Containers', icon: 'view_list' },
  { path: '/logs', label: 'Logs', icon: 'subject' },
  { path: '/host', label: 'Host Server', icon: 'dns' },
  { path: '/projects', label: 'Compose Projects', icon: 'layers' },
  { path: '/events', label: 'Events', icon: 'timeline' },
  { path: '/alerts', label: 'Alerts', icon: 'notifications' },
  { path: '/resources', label: 'Resources', icon: 'storage' },
  { path: '/audit', label: 'Audit Log', icon: 'history', minRole: 'admin' },
  { path: '/users', label: 'Users & Roles', icon: 'group', minRole: 'admin' },
  { path: '/settings', label: 'Settings', icon: 'settings' }
];
