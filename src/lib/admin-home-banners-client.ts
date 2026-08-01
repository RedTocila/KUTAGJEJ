'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export interface AdminHomeBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  order: number;
  isActive: boolean;
  updatedAt?: string;
}

export interface HomeBannerInput {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  order: number;
  isActive: boolean;
}

export async function listAdminHomeBanners(): Promise<{
  banners?: AdminHomeBanner[];
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/admin/home-banners'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Lista dështoi.' };
    return { banners: data.banners as AdminHomeBanner[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function createHomeBanner(
  body: HomeBannerInput,
): Promise<{ banner?: AdminHomeBanner; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/admin/home-banners'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Krijimi dështoi.' };
    return { banner: data.banner as AdminHomeBanner };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateHomeBanner(
  id: string,
  body: Partial<HomeBannerInput>,
): Promise<{ banner?: AdminHomeBanner; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/home-banners/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Përditësimi dështoi.' };
    return { banner: data.banner as AdminHomeBanner };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function deleteHomeBanner(id: string): Promise<{ ok?: boolean; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/admin/home-banners/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Fshirja dështoi.' };
    return { ok: true };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
