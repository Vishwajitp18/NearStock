export type UserRole = 'customer' | 'shopkeeper' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email?: string;
  is_active?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

