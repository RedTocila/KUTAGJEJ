'use client';

import Cookies from 'js-cookie';

import { getPostSignOutPath } from '@/lib/auth/post-login-path';
import type { User } from '@/types/user';

function persistUserProfile(profile: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user-data', JSON.stringify(profile));
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const loginErrorSq = (message: string | undefined): string => {
  const key = (message || '').trim();
  const map: Record<string, string> = {
    'Invalid credentials': 'Email ose fjalëkalim i pasaktë.',
    'Email and password required': 'Emaili dhe fjalëkalimi janë të detyrueshëm.',
    'Authentication failed': 'Identifikimi dështoi. Kontrollo emailin dhe fjalëkalimin.',
    'Server error': 'Gabim serveri. Provoni përsëri më vonë.',
    'Gabim serveri.': 'Gabim serveri. Provoni përsëri më vonë.',
  };
  return map[key] ?? (key || 'Identifikimi dështoi. Provoni përsëri.');
};

const registerErrorSq = (message: string | undefined): string => {
  const key = (message || '').trim();
  return key || 'Regjistrimi dështoi. Provoni përsëri.';
};

export interface SignInParams {
  email: string;
  password: string;
}

export type RegisterParams =
  | {
      userType: 'individual';
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }
  | {
      userType: 'business';
      nipt: string;
      businessName: string;
      businessOwner: string;
      businessCategory: string;
      email: string;
      password: string;
    };

class AuthClient {
  async signIn(params: SignInParams): Promise<{ error?: string; user?: User }> {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) return { error: loginErrorSq(data.message) };
      localStorage.setItem('custom-auth-token', data.token);
      persistUserProfile(data.admin);
      return { user: data.admin as User };
    } catch (_error) {
      return { error: 'Nuk u arrit lidhja me serverin. Kontrollo rrjetin ose adresën e API-së.' };
    }
  }

  async register(params: RegisterParams): Promise<{ error?: string; user?: User }> {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) return { error: registerErrorSq(data.message) };
      localStorage.setItem('custom-auth-token', data.token);
      persistUserProfile(data.admin);
      return { user: data.admin as User };
    } catch (_error) {
      return { error: 'Nuk u arrit lidhja me serverin. Kontrollo rrjetin ose adresën e API-së.' };
    }
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const token = localStorage.getItem('custom-auth-token');
    if (!token) return { data: null };
    
    try {
      const res = await fetch(`${API_URL}/auth/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem('custom-auth-token');
        localStorage.removeItem('user-data');
        return { data: null };
      }
      const data = await res.json();
      persistUserProfile(data.admin);
      return { data: data.admin as User };
    } catch (_error) {
      return { data: null };
    }
  }

  /**
   * Clears session and navigates away. Portal users go to `/user/auth`; admin/staff to `/auth/sign-in`.
   * Pass `redirectTo` to override (e.g. tests).
   */
  async signOut(redirectTo?: string): Promise<void> {
    if (typeof window === 'undefined') return;

    let target = redirectTo;
    if (!target) {
      let u: User | null = null;
      try {
        const raw = localStorage.getItem('user-data');
        u = raw ? (JSON.parse(raw) as User) : null;
      } catch {
        u = null;
      }
      target = getPostSignOutPath(u, window.location.pathname);
    }

    localStorage.removeItem('custom-auth-token');
    localStorage.removeItem('user-data');
    localStorage.removeItem('user');
    Cookies.remove('custom-auth-token');
    Cookies.remove('user-data');
    Cookies.remove('user');

    window.location.href = target;
  }

  async updateAdminProfile(body: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<{ admin?: User; error?: string }> {
    try {
      const res = await fetch(`${API_URL}/auth/admin/update-profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
      if (data.admin) persistUserProfile(data.admin);
      return { admin: data.admin };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

  async changeAdminPassword(body: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ error?: string; ok?: boolean }> {
    try {
      const res = await fetch(`${API_URL}/auth/admin/change-password`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Ndryshimi i fjalëkalimit dështoi.' };
      return { ok: true };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

  /** Individual / business portal users (`/user/...`). */
  async changePortalPassword(body: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ error?: string; ok?: boolean }> {
    try {
      const res = await fetch(`${API_URL}/auth/portal/change-password`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Ndryshimi i fjalëkalimit dështoi.' };
      return { ok: true };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }
}

export const authClient = new AuthClient();
