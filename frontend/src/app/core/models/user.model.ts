export type UserRole = 'viewer' | 'operator' | 'admin';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  isActive?: boolean;
  is_active?: boolean;
  force_password_change?: boolean;
  totp_enabled?: boolean;
}
