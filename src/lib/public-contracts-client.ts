'use client';

import type { PublicContract } from '@/types/contract';
import { apiFetch } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

const CONTRACTS_TTL_MS = 60_000;
const contractsCache = new Map<
  string,
  { at: number; value: { contracts?: PublicContract[]; error?: string } }
>();

export async function listPublicContracts(params?: {
  categoryKey?: string;
  subscriberKind?: 'agent' | 'company';
}): Promise<{ contracts?: PublicContract[]; error?: string }> {
  const cacheKey = `${params?.categoryKey ?? ''}|${params?.subscriberKind ?? ''}`;
  const hit = contractsCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CONTRACTS_TTL_MS && !hit.value.error) {
    return hit.value;
  }

  try {
    const sp = new URLSearchParams();
    if (params?.categoryKey) sp.set('categoryKey', params.categoryKey);
    if (params?.subscriberKind) sp.set('subscriberKind', params.subscriberKind);
    const q = sp.toString();
    const url = getApiUrl(q ? `/contracts?${q}` : '/contracts');
    const res = await apiFetch(url);
    const data = await res.json().catch(() => ({}));
    const value = !res.ok
      ? { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' }
      : { contracts: data.contracts as PublicContract[] };
    if (!value.error) contractsCache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
