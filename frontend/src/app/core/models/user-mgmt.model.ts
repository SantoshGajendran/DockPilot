export interface UserItem {
  id: string;
  username: string;
  email?: string | null;
  role: 'viewer' | 'operator' | 'admin' | string;
  is_active: boolean;
  force_password_change: boolean;
  totp_enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UsersListResponse {
  items: UserItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  role: string;
  email?: string;
  is_active: boolean;
  force_password_change: boolean;
}

export interface UserUpdateRequest {
  role?: string;
  email?: string;
  is_active?: boolean;
  force_password_change?: boolean;
}

export interface AdminPasswordResetRequest {
  new_password: string;
  force_password_change: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface TotpEnrolResponse {
  secret: string;
  otpauth_url: string;
}

export interface UserSession {
  id: string;
  created_at: string;
  last_seen_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  is_current: boolean;
}

export interface UserSessionsListResponse {
  items: UserSession[];
  total: number;
}
