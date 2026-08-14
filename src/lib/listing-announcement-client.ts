'use client';

import { getAccessToken } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

async function authJsonHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type BusinessAnnouncement = {
  title: string | null;
  subtitle: string | null;
  bannerUrl: string | null;
  announcedAt?: string | null;
};

export const ANNOUNCE_COST_BC = 10;

export async function upsertBusinessAnnouncement(params: {
  listingId: string;
  title: string;
  subtitle?: string | null;
  bannerUrl?: string | null;
  /** Charge 10 BC and bump listing when true, or when creating the first announcement. */
  reAnnounce?: boolean;
}): Promise<{
  announcement?: BusinessAnnouncement;
  charged?: boolean;
  cost?: number;
  boostCredits?: number;
  refreshedAt?: string | null;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/listings/announcement'), {
      method: 'POST',
      headers: await authJsonHeaders(),
      body: JSON.stringify({
        listingId: params.listingId,
        title: params.title,
        subtitle: params.subtitle ?? null,
        bannerUrl: params.bannerUrl ?? null,
        reAnnounce: Boolean(params.reAnnounce),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Shpallja dështoi.' };
    }
    return {
      announcement: data.announcement as BusinessAnnouncement | undefined,
      charged: Boolean(data.charged),
      cost: typeof data.cost === 'number' ? data.cost : undefined,
      boostCredits: typeof data.boostCredits === 'number' ? data.boostCredits : undefined,
      refreshedAt: typeof data.refreshedAt === 'string' ? data.refreshedAt : null,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function clearBusinessAnnouncement(listingId: string): Promise<{
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl(`/listings/announcement?listingId=${encodeURIComponent(listingId)}`), {
      method: 'DELETE',
      headers: await authJsonHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Heqja dështoi.' };
    }
    return { message: typeof data.message === 'string' ? data.message : undefined };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
