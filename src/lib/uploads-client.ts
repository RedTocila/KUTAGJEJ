'use client';

import { getAccessToken } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export interface UploadImagesResult {
  urls: string[];
  error?: string;
}

/**
 * Upload listing images to the shared backend endpoint and return their public
 * URLs. Used by every listing category (real estate, cars, jobs, marketplace,
 * businesses, professionals). The `folder` groups uploads in storage.
 */
export async function uploadListingImages(
  files: File[],
  folder = 'listings',
): Promise<UploadImagesResult> {
  if (!files.length) return { urls: [] };
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const fd = new FormData();
    files.forEach((file) => fd.append('images', file, file.name));
    fd.append('folder', folder);

    const res = await fetch(getApiUrl('/uploads/images'), {
      method: 'POST',
      headers,
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        urls: [],
        error: typeof data.message === 'string' ? data.message : 'Nuk u arrit ngarkimi i fotove.',
      };
    }
    return { urls: Array.isArray(data.urls) ? (data.urls as string[]) : [] };
  } catch {
    return { urls: [], error: 'Nuk u arrit lidhja me serverin.' };
  }
}
