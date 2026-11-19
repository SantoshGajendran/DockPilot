export type UserRole = 'viewer' | 'operator' | 'admin';

export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  isActive?: boolean;
  is_active?: boolean;
}
