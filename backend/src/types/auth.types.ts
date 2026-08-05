import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UserPayload {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthResponse {
  token: string;
  user: UserPayload;
}

export interface JwtPayload {
  id: string;
  email: string;
  name?: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
