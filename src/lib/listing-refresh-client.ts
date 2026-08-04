'use client';

import { getAccessToken } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import type { ListingMetricKind } from '@/lib/listing-metrics';

async function authJsonHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function refreshListingBoost(params: {
  kind: ListingMetricKind;
  listingId: string;
}): Promise<{
  refreshedAt?: string;
  boostCredits?: number;
  cost?: number;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/listings/refresh'), {
      method: 'POST',
      headers: await authJsonHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Rifreskimi dështoi.' };
    }
    return {
      refreshedAt: typeof data.refreshedAt === 'string' ? data.refreshedAt : undefined,
      boostCredits: typeof data.boostCredits === 'number' ? data.boostCredits : undefined,
      cost: typeof data.cost === 'number' ? data.cost : undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export type AutoRefreshEnrollment = {
  kind: string;
  listingId: string;
  lastRefreshedAt?: string | null;
};

export async function fetchListingAutoRefresh(): Promise<{
  slots?: number;
  used?: number;
  enrolled?: AutoRefreshEnrollment[];
  planCode?: string;
  refreshEveryHours?: number;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/listings/refresh/auto'), {
      headers: await authJsonHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Statusi dështoi.' };
    }
    return {
      slots: Number(data.slots) || 0,
      used: Number(data.used) || 0,
      enrolled: Array.isArray(data.enrolled) ? (data.enrolled as AutoRefreshEnrollment[]) : [],
      planCode: typeof data.planCode === 'string' ? data.planCode : undefined,
      refreshEveryHours:
        typeof data.refreshEveryHours === 'number' ? data.refreshEveryHours : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function setListingAutoRefresh(params: {
  kind: ListingMetricKind;
  listingId: string;
  enabled: boolean;
}): Promise<{
  enabled?: boolean;
  slots?: number;
  used?: number;
  enrolled?: AutoRefreshEnrollment[];
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/listings/refresh/auto'), {
      method: 'POST',
      headers: await authJsonHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Ndryshimi dështoi.' };
    }
    return {
      enabled: Boolean(data.enabled),
      slots: Number(data.slots) || 0,
      used: Number(data.used) || 0,
      enrolled: Array.isArray(data.enrolled) ? (data.enrolled as AutoRefreshEnrollment[]) : [],
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
