'use client';

import { getAccessToken } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import type { ListingCategoryKey } from '@/types/listing-category';
import type { QuotaCounts, QuotaKind } from '@/lib/listing-quota-convert-client';

export type CategoryQuotaSnapshot = {
  hasPaidPlan: boolean;
  subscriptionId: string | null;
  available: QuotaCounts;
  used: QuotaCounts;
  max: QuotaCounts;
};

const CATEGORY_TO_QUOTA_KIND: Partial<Record<ListingCategoryKey, QuotaKind>> = {
  cars: 'car',
  marketplace: 'product',
  'real-estate': 'apartment',
  'job-listings': 'job',
};

export function quotaKindForCategory(key: ListingCategoryKey): QuotaKind | null {
  return CATEGORY_TO_QUOTA_KIND[key] ?? null;
}

export function isCategoryQuotaAvailable(
  snapshot: CategoryQuotaSnapshot | null | undefined,
  key: ListingCategoryKey,
): boolean {
  const kind = quotaKindForCategory(key);
  if (!kind) return true;
  if (!snapshot) return true;
  return (snapshot.available[kind] ?? 0) > 0;
}

export async function fetchCategoryQuotas(): Promise<{
  snapshot?: CategoryQuotaSnapshot;
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(getApiUrl('/listings/category-quota'), {
      headers,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Ngarkimi dështoi.' };
    }
    return { snapshot: data as CategoryQuotaSnapshot };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
