'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type AdminAiPrices = {
  aiBuildPerLink: number;
  aiAssist: number;
  aiMenuPerImage: number;
  aiSearch: number;
};

function mapPrices(raw: Record<string, unknown> | undefined): AdminAiPrices {
  const n = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    aiBuildPerLink: n(raw?.aiBuildPerLink, 1),
    aiAssist: n(raw?.aiAssist ?? raw?.other, 0.5),
    aiMenuPerImage: n(raw?.aiMenuPerImage, 1),
    aiSearch: n(raw?.aiSearch, 0),
  };
}

export async function fetchAdminAiPrices(): Promise<{ prices?: AdminAiPrices; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/ai-prices'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { prices: mapPrices(data.prices) };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function saveAdminAiPrices(
  prices: AdminAiPrices,
): Promise<{ prices?: AdminAiPrices; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/ai-prices'), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(prices),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Ruajtja dështoi.' };
    return { prices: mapPrices(data.prices) };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
