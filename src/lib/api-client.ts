'use client';

import { getApiUrl } from '@/lib/api-config';

export function authHeaders(extra?: Record<string, string>): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
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

/** Authenticated browser fetch with consistent error parsing. */
export async function clientFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<ClientFetchResult<T>> {
  try {
    const res = await fetch(getApiUrl(path), {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
    });
    const data = (await res.json().catch(() => ({}))) as T & { message?: string };
    if (!res.ok) {
      const message = typeof data?.message === 'string' ? data.message : undefined;
      return { ok: false, status: res.status, error: message };
    }
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, error: 'Nuk u arrit lidhja me serverin.' };
  }
}
