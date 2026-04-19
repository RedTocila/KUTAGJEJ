'use client';

import type { ListingCategory, ListingCategoryKey } from '@/types/listing-category';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function listCategoriesAdmin(): Promise<{ categories?: ListingCategory[]; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/categories`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista e kategorive dështoi.' };
    return { categories: data.categories as ListingCategory[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateCategory(
  key: ListingCategoryKey,
  body: Partial<{ title: string; slug: string; listingTypes: { slug: string; label: string }[] }>,
): Promise<{ category?: ListingCategory; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/categories/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { category: data.category as ListingCategory };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
