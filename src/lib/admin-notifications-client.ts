'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type AdminNotification = {
  id: string;
  type: 'listing_submitted' | 'job_employer_verification' | 'professional_verification';
  refKind: string;
  refId: string | null;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export async function listAdminNotifications(
  unreadOnly = false,
  limit = 20,
): Promise<{ notifications?: AdminNotification[]; unread?: number; error?: string }> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (unreadOnly) params.set('unreadOnly', '1');
    const res = await fetch(getApiUrl(`/admin/notifications?${params}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return {
      notifications: (data.notifications ?? []) as AdminNotification[],
      unread: data.unread,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function markAdminNotificationRead(id: string): Promise<{ error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/notifications/${encodeURIComponent(id)}/read`), {
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

export async function markAllAdminNotificationsRead(): Promise<{ error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/notifications/read-all'), {
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
