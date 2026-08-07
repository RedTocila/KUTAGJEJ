'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  refKind: string;
  refId: string | null;
  actorId: string | null;
  actorName: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPreferences = {
  messages: boolean;
  listing_saved: boolean;
  listing_status: boolean;
  reviews: boolean;
  reservations: boolean;
  verification: boolean;
};

export async function listUserNotifications(
  unreadOnly = false,
  limit = 20,
): Promise<{ notifications?: UserNotification[]; unread?: number; error?: string }> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (unreadOnly) params.set('unreadOnly', '1');
    const res = await fetch(getApiUrl(`/user-notifications?${params}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return {
      notifications: (data.notifications ?? []) as UserNotification[],
      unread: data.unread,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function markUserNotificationRead(id: string): Promise<{ error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/user-notifications/${encodeURIComponent(id)}/read`), {
      method: 'PATCH',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return {};
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function markUserNotificationsRead(ids: string[]): Promise<{ error?: string }> {
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  const results = await Promise.all(unique.map((id) => markUserNotificationRead(id)));
  const firstError = results.find((r) => r.error)?.error;
  return firstError ? { error: firstError } : {};
}

export async function markAllUserNotificationsRead(): Promise<{ error?: string }> {
  try {
    const res = await fetch(getApiUrl('/user-notifications/read-all'), {
      method: 'PATCH',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return {};
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function fetchNotificationPreferences(): Promise<{
  preferences?: NotificationPreferences;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/user-notifications/preferences'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { preferences: data.preferences as NotificationPreferences };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<{ preferences?: NotificationPreferences; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/user-notifications/preferences'), {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { preferences: data.preferences as NotificationPreferences };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
