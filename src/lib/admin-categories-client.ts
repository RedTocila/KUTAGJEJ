'use client';

import type { ListingCategory, ListingCategoryKey } from '@/types/listing-category';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';


export async function listCategoriesAdmin(): Promise<{ categories?: ListingCategory[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/categories'), { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista e kategorive dështoi.' };
    return { categories: data.categories as ListingCategory[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateCategory(
  key: ListingCategoryKey,
  body: Partial<{
    title: string;
    slug: string;
    listingTypes: { slug: string; label: string }[];
    apartmentTypes: { slug: string; label: string }[];
  }>,
): Promise<{ category?: ListingCategory; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/categories/${encodeURIComponent(key)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    if (!data?.category) {
      return { error: 'Përgjigje e pavlefshme nga serveri (mungon kategoria).' };
    }
    return { category: data.category as ListingCategory };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
