'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type AdminListingRow = {
  id: string;
  kind: string;
  kindLabel: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  posterId: string;
  posterModel: string;
  cityName: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  adminNote: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listAdminListings(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
  kind?: string,
  page = 1,
): Promise<{
  listings?: AdminListingRow[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({ status, page: String(page), limit: '24' });
    if (kind) params.set('kind', kind);
    const res = await fetch(getApiUrl(`/admin/listings?${params}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return {
      listings: (data.listings ?? []) as AdminListingRow[],
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function reviewAdminListing(
  kind: string,
  id: string,
  decision: 'approve' | 'reject',
  adminNote?: string,
): Promise<{ listing?: AdminListingRow; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/listings/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ decision, adminNote: adminNote?.trim() || '' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { listing: data.listing as AdminListingRow };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
