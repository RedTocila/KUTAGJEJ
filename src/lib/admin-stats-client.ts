'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type ListingKindStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type AdminStats = {
  listings: {
    byKind: Record<string, ListingKindStats>;
    totals: ListingKindStats;
  };
  users: {
    managed: number;
    individual: number;
    business: number;
    total: number;
  };
  notifications: { unread: number };
};

export async function fetchAdminStats(): Promise<{ stats?: AdminStats; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/stats'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { stats: data as AdminStats };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
