import { UserRole } from '../models/user.model';

export type NavGroup = 'MONITOR' | 'CONTROL' | 'SYSTEM';

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  strokeIcon?: string;
  group?: NavGroup;
  minRole?: UserRole;
  shortcut?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  // MONITOR group
  { path: '/dashboard', label: 'Overview', icon: 'dashboard', strokeIcon: 'dashboard', group: 'MONITOR', shortcut: 'g d' },
  { path: '/containers', label: 'Containers', icon: 'view_list', strokeIcon: 'containers', group: 'CONTROL', shortcut: 'g c' },
  { path: '/logs', label: 'Logs', icon: 'subject', strokeIcon: 'logs', group: 'MONITOR', shortcut: 'g l' },
  { path: '/host', label: 'Host Server', icon: 'dns', strokeIcon: 'host', group: 'MONITOR', shortcut: 'g h' },
  { path: '/projects', label: 'Compose Projects', icon: 'layers', strokeIcon: 'projects', group: 'CONTROL', shortcut: 'g p' },
  { path: '/events', label: 'Events', icon: 'timeline', strokeIcon: 'events', group: 'MONITOR', shortcut: 'g e' },
  { path: '/alerts', label: 'Alerts', icon: 'notifications', strokeIcon: 'alerts', group: 'MONITOR', shortcut: 'g a' },
  { path: '/resources', label: 'Resources', icon: 'storage', strokeIcon: 'resources', group: 'CONTROL', shortcut: 'g r' },
  { path: '/audit', label: 'Audit Log', icon: 'history', strokeIcon: 'audit', group: 'SYSTEM', minRole: 'admin', shortcut: 'g u' },
  { path: '/users', label: 'Users & Roles', icon: 'group', strokeIcon: 'users', group: 'SYSTEM', minRole: 'admin', shortcut: 'g m' },
  { path: '/settings', label: 'Settings', icon: 'settings', strokeIcon: 'settings', group: 'SYSTEM', shortcut: 'g s' }
];

export const NAV_SECTIONS: { group: NavGroup; label: string }[] = [
  { group: 'MONITOR', label: 'MONITOR' },
  { group: 'CONTROL', label: 'CONTROL' },
  { group: 'SYSTEM', label: 'SYSTEM' }
];
