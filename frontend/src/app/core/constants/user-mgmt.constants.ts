export const USERS_ENDPOINTS = {
  users: 'api/v1/users',
  changePassword: 'api/v1/auth/change-password',
  totpEnrol: 'api/v1/auth/2fa/enrol',
  totpVerify: 'api/v1/auth/2fa/verify',
  totpDisable: 'api/v1/auth/2fa/disable',
  sessions: 'api/v1/auth/sessions',
  revokeAll: 'api/v1/auth/sessions/revoke-all',
};

export interface RoleMeta {
  value: string;
  label: string;
  description: string;
  icon: string;
  colorClass: string;
}

export const ROLE_OPTIONS: RoleMeta[] = [
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to metrics, logs, containers',
    icon: 'visibility',
    colorClass: 'role-viewer',
  },
  {
    value: 'operator',
    label: 'Operator',
    description: 'Container and compose control actions',
    icon: 'build',
    colorClass: 'role-operator',
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Full administrative control and user management',
    icon: 'security',
    colorClass: 'role-admin',
  },
];

export function getRoleMeta(role: string): RoleMeta {
  const norm = (role || '').toLowerCase();
  return (
    ROLE_OPTIONS.find((r) => r.value === norm) || {
      value: role,
      label: role.charAt(0).toUpperCase() + role.slice(1),
      description: '',
      icon: 'person',
      colorClass: 'role-default',
    }
  );
}
