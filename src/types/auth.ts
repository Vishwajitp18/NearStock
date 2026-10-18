import { Request } from 'express';

export type UserRole = 'customer' | 'shopkeeper' | 'admin';

export interface AuthUser {
  id: string;
  role: UserRole;
  phone: string;
  name: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

