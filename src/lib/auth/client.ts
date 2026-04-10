'use client';

import type { User } from '@/types/user';

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

export interface SignInParams {
  email: string;
  password: string;
}

class AuthClient {
  async signIn(params: SignInParams): Promise<{ error?: string; role?: string }> {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) return { error: loginErrorSq(data.message) };
      localStorage.setItem('custom-auth-token', data.token);
      localStorage.setItem('user-data', JSON.stringify(data.admin));
      return { role: data.admin.role };
    } catch (error) {
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
      localStorage.setItem('user-data', JSON.stringify(data.admin));
      return { data: { ...data.admin, userType: 'admin' } };
    } catch (error) {
      return { data: null };
    }
  }

  async signOut(): Promise<void> {
    localStorage.removeItem('custom-auth-token');
    localStorage.removeItem('user-data');
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
      if (data.admin) localStorage.setItem('user-data', JSON.stringify(data.admin));
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
}

export const authClient = new AuthClient();
