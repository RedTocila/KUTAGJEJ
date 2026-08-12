'use client';

import { getApiUrl } from '@/lib/api-config';
import {
  AUTH_REFRESH_KEY,
  AUTH_TOKEN_KEY,
  readAuthItem,
  writeAuthItem,
} from '@/lib/auth/storage';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export { AUTH_REFRESH_KEY, AUTH_TOKEN_KEY };

function readStoredToken(): string | null {
  return readAuthItem(AUTH_TOKEN_KEY);
}

export function persistTokens(access: string | null | undefined, refresh?: string | null): void {
  if (typeof window === 'undefined') return;
  writeAuthItem(AUTH_TOKEN_KEY, access || null);
  if (refresh !== undefined) {
    writeAuthItem(AUTH_REFRESH_KEY, refresh || null);
  }
}

/**
 * Prefer a live Supabase browser session (auto-refreshed), then stored access token,
 * then refresh via stored refresh token.
 */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const sb = getSupabaseBrowserClient();
    const { data } = await sb.auth.getSession();
    const live = data.session?.access_token;
    if (live) {
      persistTokens(live, data.session?.refresh_token ?? undefined);
      return live;
    }
  } catch {
    /* optional browser client */
  }

  const stored = readStoredToken();
  if (stored) return stored;

  const refresh = readAuthItem(AUTH_REFRESH_KEY);
  if (!refresh) return null;

  try {
    const res = await apiFetch(getApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.token !== 'string') {
      persistTokens(null, null);
      return null;
    }
    const nextRefresh = typeof data.refreshToken === 'string' ? data.refreshToken : refresh;
    persistTokens(data.token, nextRefresh);
    try {
      const sb = getSupabaseBrowserClient();
      await sb.auth.setSession({
        access_token: data.token,
        refresh_token: nextRefresh,
      });
    } catch {
      /* ignore */
    }
    return data.token as string;
  } catch {
    return null;
  }
}

export function authHeaders(extra?: Record<string, string>): HeadersInit {
  const token = readStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Same as authHeaders but awaits a refreshed access token when possible. */
export async function authHeadersAsync(extra?: Record<string, string>): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export interface ClientFetchResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Browser fetch with short retries for cold starts / flaky mobile networks.
 * Does not retry typical 4xx (except timeout/rate-limit).
 */
export async function apiFetch(input: string, init?: RequestInit, retries = 2): Promise<Response> {
  let lastError: unknown;
  const attempts = Math.max(1, retries + 1);
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(input, init);
      if (RETRYABLE_STATUSES.has(res.status) && attempt < attempts - 1) {
        await sleep(250 * 2 ** attempt);
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await sleep(250 * 2 ** attempt);
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

/** Authenticated browser fetch with consistent error parsing. */
export async function clientFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<ClientFetchResult<T>> {
  try {
    const res = await apiFetch(getApiUrl(path), {
      ...init,
      headers: {
        ...(await authHeadersAsync()),
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      message?: string;
      error?: string;
      code?: string;
    };
    if (!res.ok) {
      const message =
        (typeof data?.message === 'string' && data.message) ||
        (typeof data?.error === 'string' && data.error) ||
        undefined;
      if (message) return { ok: false, status: res.status, error: message, data };
      if (res.status === 413) {
        return { ok: false, status: 413, error: 'Fotot janë shumë të mëdha. Provoni me më pak foto.', data };
      }
      if (res.status === 401) {
        return { ok: false, status: 401, error: 'Sesioni skadoi. Hyni përsëri.', data };
      }
      if (res.status >= 500) {
        return { ok: false, status: res.status, error: 'Gabim serveri. Provoni përsëri.', data };
      }
      return { ok: false, status: res.status, error: 'Kërkesa dështoi.', data };
    }
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, error: 'Nuk u arrit lidhja me serverin.' };
  }
}
