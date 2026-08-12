'use client';

/** Access token storage key (Supabase access_token from /api/auth). */
export const AUTH_TOKEN_KEY = 'custom-auth-token';
/** Refresh token for renewing expired access tokens. */
export const AUTH_REFRESH_KEY = 'custom-auth-refresh';
export const AUTH_USER_KEY = 'user-data';
const AUTH_REMEMBER_KEY = 'kutagjej-remember-login';
const AUTH_REMEMBERED_EMAIL_KEY = 'kutagjej-remembered-email';

function localStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** True when the last login asked to stay signed in (default for existing sessions). */
export function isRememberLoginEnabled(): boolean {
  const local = localStore();
  if (!local) return true;
  return local.getItem(AUTH_REMEMBER_KEY) !== '0';
}

export function setRememberLoginEnabled(remember: boolean): void {
  const local = localStore();
  if (!local) return;
  local.setItem(AUTH_REMEMBER_KEY, remember ? '1' : '0');
}

function writeStore(): Storage | null {
  return isRememberLoginEnabled() ? localStore() : sessionStore();
}

function otherStore(): Storage | null {
  return isRememberLoginEnabled() ? sessionStore() : localStore();
}

export function readAuthItem(key: string): string | null {
  try {
    return sessionStore()?.getItem(key) ?? localStore()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeAuthItem(key: string, value: string | null): void {
  try {
    const dest = writeStore();
    const other = otherStore();
    if (value) dest?.setItem(key, value);
    else dest?.removeItem(key);
    other?.removeItem(key);
  } catch {
    /* private mode / quota */
  }
}

export function clearAuthSession(): void {
  for (const key of [AUTH_TOKEN_KEY, AUTH_REFRESH_KEY, AUTH_USER_KEY, 'user', 'kutagjej-auth']) {
    try {
      localStore()?.removeItem(key);
      sessionStore()?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function hasStoredAccessToken(): boolean {
  return Boolean(readAuthItem(AUTH_TOKEN_KEY));
}

export function readRememberedEmail(): string {
  try {
    return (localStore()?.getItem(AUTH_REMEMBERED_EMAIL_KEY) ?? '').trim();
  } catch {
    return '';
  }
}

export function writeRememberedEmail(email: string | null): void {
  try {
    const local = localStore();
    if (!local) return;
    const next = (email ?? '').trim();
    if (next) local.setItem(AUTH_REMEMBERED_EMAIL_KEY, next);
    else local.removeItem(AUTH_REMEMBERED_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

/** Minimal Storage used by the browser Supabase client so session follows remember-login. */
export const supabaseAuthStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: (key) => readAuthItem(key),
  setItem: (key, value) => {
    writeAuthItem(key, value);
  },
  removeItem: (key) => {
    writeAuthItem(key, null);
  },
};
