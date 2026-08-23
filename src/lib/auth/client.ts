'use client';

import Cookies from 'js-cookie';

import { authHeaders, persistTokens, getAccessToken, AUTH_TOKEN_KEY, AUTH_REFRESH_KEY } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import { getPostSignOutPath } from '@/lib/auth/post-login-path';
import {
  AUTH_USER_KEY,
  clearAuthSession,
  readAuthItem,
  setRememberLoginEnabled,
  writeAuthItem,
  writeRememberedEmail,
} from '@/lib/auth/storage';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { prepareAvatarForUpload } from '@/lib/uploads-client';
import type { User } from '@/types/user';

export { AUTH_TOKEN_KEY, AUTH_REFRESH_KEY };

function persistUserProfile(profile: unknown): void {
  if (typeof window === 'undefined') return;
  writeAuthItem(AUTH_USER_KEY, JSON.stringify(profile));
}

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = readAuthItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function persistAccessToken(token: string | null | undefined, refreshToken?: string | null): void {
  persistTokens(token, refreshToken === undefined ? undefined : refreshToken);
}

/** Hydrate the browser Supabase client without a second password round-trip.
 * Never block redirect on a hung auth network call (same class of bug as sign-out). */
async function syncBrowserSession(accessToken: string, refreshToken: string | null | undefined): Promise<void> {
  try {
    const sb = getSupabaseBrowserClient();
    await Promise.race([
      sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
      }),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 800);
      }),
    ]);
  } catch {
    /* browser session optional; API token is source of truth for /api */
  }
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
  /** Persist the session across browser restarts. Defaults to true. */
  remember?: boolean;
}

export type RegisterParams =
  | {
      userType: 'individual';
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      basedCityId?: string;
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
      basedCityId?: string;
      referralCode?: string;
    };

class AuthClient {
  async signIn(params: SignInParams): Promise<{ error?: string; user?: User; code?: string }> {
    try {
      const remember = params.remember !== false;
      const res = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: params.email, password: params.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = typeof data.code === 'string' ? data.code : undefined;
        return { error: loginErrorSq(data.message), code };
      }
      setRememberLoginEnabled(remember);
      writeRememberedEmail(remember ? params.email : null);
      persistAccessToken(data.token, data.refreshToken ?? null);
      persistUserProfile(data.admin);
      await syncBrowserSession(data.token, data.refreshToken ?? null);
      return { user: data.admin as User };
    } catch (_error) {
      return { error: 'Nuk u arrit lidhja me serverin. Kontrollo rrjetin ose adresën e API-së.' };
    }
  }

  async register(params: RegisterParams): Promise<{
    error?: string;
    user?: User;
    needsEmailConfirmation?: boolean;
    email?: string;
  }> {
    try {
      const res = await fetch(getApiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) return { error: registerErrorSq(data.message) };
      if (data.needsEmailConfirmation) {
        return { needsEmailConfirmation: true, email: data.email || params.email };
      }
      setRememberLoginEnabled(true);
      writeRememberedEmail(params.email);
      if (data.token) persistAccessToken(data.token, data.refreshToken ?? null);
      persistUserProfile(data.admin);
      if (data.token) await syncBrowserSession(data.token, data.refreshToken ?? null);
      return { user: data.admin as User };
    } catch (_error) {
      return { error: 'Nuk u arrit lidhja me serverin. Kontrollo rrjetin ose adresën e API-së.' };
    }
  }

  async getUser(): Promise<{ data?: User | null; error?: string }> {
    const token = await getAccessToken();
    if (!token) return { data: null };

    try {
      const res = await fetch(getApiUrl('/auth/admin/me'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          persistAccessToken(null, null);
          writeAuthItem(AUTH_USER_KEY, null);
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
        const raw = readAuthItem(AUTH_USER_KEY);
        u = raw ? (JSON.parse(raw) as User) : null;
      } catch {
        u = null;
      }
      target = getPostSignOutPath(u, window.location.pathname);
    }

    persistAccessToken(null, null);
    clearAuthSession();
    Cookies.remove(AUTH_TOKEN_KEY);
    Cookies.remove(AUTH_REFRESH_KEY);
    Cookies.remove('user-data');
    Cookies.remove('user');

    // Clear the browser session locally so redirect is never blocked by a hung
    // network revoke. A previous `await signOut()` left the UI logged-in until refresh.
    try {
      await Promise.race([
        getSupabaseBrowserClient().auth.signOut({ scope: 'local' }),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 500);
        }),
      ]);
    } catch {
      /* ignore */
    }

    // Full document navigation so UserProvider remounts without a stale user.
    window.location.assign(target);
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

  async updatePortalProfile(body: {
    phone?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    businessOwner?: string;
    businessCategory?: string;
    basedCityId?: string | null;
    shareThemeColor?: string | null;
    /** Public profile photo URL; empty string clears it. */
    avatar?: string;
  }): Promise<{ admin?: User; error?: string }> {
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

  async convertToBusinessAccount(body: {
    nipt: string;
    businessName: string;
    businessOwner: string;
    businessCategory: string;
    phone?: string;
  }): Promise<{ admin?: User; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/auth/portal/convert-to-business'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          error: typeof data.message === 'string' ? data.message : 'Kthimi në llogari biznesi dështoi.',
        };
      }
      if (data.admin) persistUserProfile(data.admin);
      return { admin: data.admin as User };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

  async uploadPortalAvatar(file: File): Promise<{ admin?: User; avatar?: string; error?: string }> {
    try {
      const token = await getAccessToken();
      if (!token) return { error: 'Duhet të jeni të identifikuar.' };
      const prepared = await prepareAvatarForUpload(file);
      const fd = new FormData();
      fd.append('avatar', prepared, prepared.name);
      const res = await fetch(getApiUrl('/auth/portal/avatar'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: typeof data.message === 'string' ? data.message : 'Ngarkimi i fotos dështoi.' };
      }
      const avatar =
        (typeof data.avatarUrl === 'string' && data.avatarUrl) ||
        (typeof data.admin?.avatar === 'string' && data.admin.avatar) ||
        '';
      if (!avatar) {
        return { error: 'Foto u ngarkua por nuk u ruajt te profili. Rifreskoni faqen dhe provojeni përsëri.' };
      }
      if (data.admin) persistUserProfile(data.admin);
      return { admin: data.admin as User, avatar };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

  async removePortalAvatar(): Promise<{ admin?: User; error?: string }> {
    try {
      const res = await fetch(getApiUrl('/auth/portal/avatar'), {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Heqja e fotos dështoi.' };
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

  async forgotPassword(email: string): Promise<{ error?: string; message?: string }> {
    try {
      const res = await fetch(getApiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Dërgimi dështoi.' };
      return { message: typeof data.message === 'string' ? data.message : undefined };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

  async resendConfirmation(email: string): Promise<{ error?: string; message?: string }> {
    try {
      const res = await fetch(getApiUrl('/auth/resend-confirmation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Dërgimi dështoi.' };
      return { message: typeof data.message === 'string' ? data.message : undefined };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

  async confirmEmail(tokenHash: string, type: string): Promise<{ error?: string; user?: User }> {
    try {
      const res = await fetch(getApiUrl('/auth/confirm'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash, type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Konfirmimi dështoi.' };
      setRememberLoginEnabled(true);
      persistAccessToken(data.token, data.refreshToken ?? null);
      persistUserProfile(data.admin);
      if (data.token) await syncBrowserSession(data.token, data.refreshToken ?? null);
      return { user: data.admin as User };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }

  async resetPasswordWithToken(body: {
    tokenHash: string;
    type?: string;
    newPassword: string;
  }): Promise<{ error?: string; user?: User }> {
    try {
      const res = await fetch(getApiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Rivendosja dështoi.' };
      setRememberLoginEnabled(true);
      persistAccessToken(data.token, data.refreshToken ?? null);
      persistUserProfile(data.admin);
      if (data.token) await syncBrowserSession(data.token, data.refreshToken ?? null);
      return { user: data.admin as User };
    } catch {
      return { error: 'Nuk u arrit lidhja me serverin.' };
    }
  }
}

export const authClient = new AuthClient();
