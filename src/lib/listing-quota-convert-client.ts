'use client';

import { getAccessToken } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type QuotaKind = 'car' | 'product' | 'apartment' | 'job';

export type QuotaCounts = Record<QuotaKind, number>;

export type ConvertQuotaSnapshot = {
  hasPaidPlan: boolean;
  subscriptionId: string | null;
  available: QuotaCounts;
  used: QuotaCounts;
  max: QuotaCounts;
  rates: QuotaCounts;
};

export async function fetchConvertibleQuotas(): Promise<{
  snapshot?: ConvertQuotaSnapshot;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(getApiUrl('/listings/convert-quota'), {
      headers,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Ngarkimi dështoi.' };
    }
    return { snapshot: data as ConvertQuotaSnapshot };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function convertListingQuotas(counts: Partial<QuotaCounts>): Promise<{
  creditsGranted?: number;
  boostCredits?: number;
  available?: QuotaCounts;
  max?: QuotaCounts;
  used?: QuotaCounts;
  message?: string;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(getApiUrl('/listings/convert-quota'), {
      method: 'POST',
      headers,
      body: JSON.stringify(counts),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Konvertimi dështoi.' };
    }
    return {
      creditsGranted: typeof data.creditsGranted === 'number' ? data.creditsGranted : undefined,
      boostCredits: typeof data.boostCredits === 'number' ? data.boostCredits : undefined,
      available: data.available as QuotaCounts | undefined,
      max: data.max as QuotaCounts | undefined,
      used: data.used as QuotaCounts | undefined,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
