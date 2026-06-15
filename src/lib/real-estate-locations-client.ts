'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export interface RealEstateZoneDto {
  id: string;
  name: string;
  slug: string;
}

export interface RealEstateCityDto {
  id: string;
  name: string;
  slug: string;
  zones: RealEstateZoneDto[];
}

export async function listRealEstateLocationsPublic(): Promise<{
  cities?: RealEstateCityDto[];
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/real-estate/locations'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Failed to load locations.' };
    return { cities: data.cities as RealEstateCityDto[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function listRealEstateLocationsAdmin(): Promise<{
  cities?: RealEstateCityDto[];
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/admin/real-estate/locations'), { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Failed to load cities.' };
    return { cities: data.cities as RealEstateCityDto[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function createRealEstateCity(body: {
  name: string;
  slug?: string;
  zones: { name: string; slug?: string }[];
}): Promise<{ city?: RealEstateCityDto; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/real-estate/locations'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Create failed.' };
    return { city: data.city as RealEstateCityDto };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function updateRealEstateCity(
  id: string,
  body: Partial<{ name: string; slug: string; zones: { name: string; slug?: string }[] }>,
): Promise<{ city?: RealEstateCityDto; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/real-estate/locations/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Update failed.' };
    return { city: data.city as RealEstateCityDto };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function deleteRealEstateCity(id: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/real-estate/locations/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Delete failed.' };
    return { ok: Boolean(data.ok) };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
