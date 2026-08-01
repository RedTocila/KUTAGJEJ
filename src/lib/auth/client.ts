'use client';

import Cookies from 'js-cookie';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import { getPostSignOutPath } from '@/lib/auth/post-login-path';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User } from '@/types/user';

/** Access token storage key (Supabase access_token from /api/auth). */
export const AUTH_TOKEN_KEY = 'custom-auth-token';

function persistUserProfile(profile: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user-data', JSON.stringify(profile));
}

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user-data');
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persistAccessToken(token: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
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
      phone?: string;
      referralCode?: string;
    }
  | {
      userType: 'business';
      nipt: string;
      businessName: string;
      businessOwner: string;
      businessCategory: string;
      email: string;
      password: string;
      phone?: string;
      referralCode?: string;
    };

class AuthClient {
  async signIn(params: SignInParams): Promise<{ error?: string; user?: User }> {
    try {
      const res = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) return { error: loginErrorSq(data.message) };
      persistAccessToken(data.token);
      persistUserProfile(data.admin);
      try {
        const sb = getSupabaseBrowserClient();
        await sb.auth.signInWithPassword({ email: params.email, password: params.password });
      } catch {
        /* browser session optional; API token is source of truth for /api */
      }
      return { user: data.admin as User };
    } catch (_error) {
      return { error: 'Nuk u arrit lidhja me serverin. Kontrollo rrjetin ose adresën e API-së.' };
    }
  }

  async register(params: RegisterParams): Promise<{ error?: string; user?: User }> {
    try {
      const res = await fetch(getApiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) return { error: registerErrorSq(data.message) };
      if (data.token) persistAccessToken(data.token);
      persistUserProfile(data.admin);
      try {
        if (data.token) {
          const sb = getSupabaseBrowserClient();
          await sb.auth.signInWithPassword({ email: params.email, password: params.password });
        }
      } catch {
        /* optional */
      }
      return { user: data.admin as User };
    } catch (_error) {
      return { error: 'Nuk u arrit lidhja me serverin. Kontrollo rrjetin ose adresën e API-së.' };
    }
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return { data: null };

    try {
      const res = await fetch(getApiUrl('/auth/admin/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          persistAccessToken(null);
          localStorage.removeItem('user-data');
          return { data: null };
        }
        return { data: readCachedUser(), error: res.status >= 500 ? 'Gabim serveri.' : undefined };
      }
      const data = await res.json();
      persistUserProfile(data.admin);
      return { data: data.admin as User };
    } catch (_error) {
      return { data: readCachedUser(), error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

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

    persistAccessToken(null);
    localStorage.removeItem('user-data');
    localStorage.removeItem('user');
    Cookies.remove(AUTH_TOKEN_KEY);
    Cookies.remove('user-data');
    Cookies.remove('user');
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch {
      /* ignore */
    }

    window.location.href = target;
  }

  async updateAdminProfile(body: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<{ admin?: User; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/auth/admin/update-profile'), {
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
      const res = await fetch(getApiUrl('/auth/admin/change-password'), {
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

  async updatePortalProfile(body: { phone: string }): Promise<{ admin?: User; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/auth/portal/update-profile'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
      if (data.admin) persistUserProfile(data.admin);
      return { admin: data.admin as User };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

  async changePortalPassword(body: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ error?: string; ok?: boolean }> {
    try {
      const res = await fetch(getApiUrl('/auth/portal/change-password'), {
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
