'use client';

import { getAccessToken } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export interface UploadImagesResult {
  urls: string[];
  error?: string;
  aborted?: boolean;
}

/**
 * Client-side pre-compress before upload.
 * Server also re-encodes with sharp — this keeps multipart bodies small.
 *
 * Listings / chat / banners: ~1280px long edge, JPEG ~0.72
 * Avatars: ~400px, JPEG ~0.78
 */
const MAX_EDGE = 1280;
const AVATAR_MAX_EDGE = 400;
const JPEG_QUALITY = 0.72;
const AVATAR_JPEG_QUALITY = 0.78;
/** Already-small JPEGs under this size (and within max edge) skip re-encode. */
const SKIP_COMPRESS_BYTES = 180_000;
const AVATAR_SKIP_COMPRESS_BYTES = 60_000;

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const mime = match[1] || 'image/jpeg';
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const base = filename.replace(/\.[^.]+$/, '') || 'image';
  return new File([bytes], `${base}.jpg`, { type: mime.startsWith('image/') ? mime : 'image/jpeg' });
}

/**
 * Shrink / re-encode phone photos to JPEG so uploads stay small and fast to load.
 * PNGs and oversized dimensions are always re-encoded (even when under the byte skip).
 */
async function prepareImageForUpload(
  file: File,
  opts?: { maxEdge?: number; quality?: number; skipBelowBytes?: number },
): Promise<File> {
  const maxEdge = opts?.maxEdge ?? MAX_EDGE;
  const quality = opts?.quality ?? JPEG_QUALITY;
  const skipBelow = opts?.skipBelowBytes ?? SKIP_COMPRESS_BYTES;
  if (typeof window === 'undefined' || typeof document === 'undefined') return file;

  try {
    const source = await readFileAsDataUrl(file);
    if (!source) return file;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image load failed'));
      el.src = source;
    });

    const srcW = img.width || 1;
    const srcH = img.height || 1;
    const longest = Math.max(srcW, srcH);
    const scale = Math.min(1, maxEdge / longest);
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const isJpeg = /^image\/jpe?g$/i.test(file.type);
    const withinBudget = file.size <= skipBelow && longest <= maxEdge && isJpeg;
    if (withinBudget) return file;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Flatten transparency (PNG) onto white before JPEG encode.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const out = dataUrlToFile(dataUrl, file.name);
    // Prefer compressed output even if slightly larger than a tiny original PNG icon,
    // unless compression somehow ballooned past the original.
    if (!out) return file;
    if (out.size >= file.size && isJpeg && longest <= maxEdge) return file;
    return out;
  } catch {
    return file;
  }
}

/** Profile photos — keep small so chat avatars load instantly. */
export async function prepareAvatarForUpload(file: File): Promise<File> {
  return prepareImageForUpload(file, {
    maxEdge: AVATAR_MAX_EDGE,
    quality: AVATAR_JPEG_QUALITY,
    skipBelowBytes: AVATAR_SKIP_COMPRESS_BYTES,
  });
}

async function uploadOneImage(
  file: File,
  folder: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<UploadImagesResult> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const fd = new FormData();
  fd.append('images', file, file.name);
  fd.append('folder', folder);

  try {
    const res = await fetch(getApiUrl('/uploads/images'), {
      method: 'POST',
      headers,
      body: fd,
      signal,
    });

    const raw = await res.text();
    let data: { message?: unknown; urls?: unknown } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      if (typeof data.message === 'string' && data.message.trim()) {
        return { urls: [], error: data.message };
      }
      if (res.status === 413 || res.status === 431) {
        return { urls: [], error: 'Fotoja është shumë e madhe. Provo një foto më të vogël.' };
      }
      if (res.status === 401 || res.status === 403) {
        return { urls: [], error: 'Duhet të jeni të identifikuar për të ngarkuar foto.' };
    }
      return { urls: [], error: 'Nuk u arrit ngarkimi i fotove.' };
    }

    const urls = Array.isArray(data.urls) ? (data.urls as string[]) : [];
    if (!urls.length) {
      return { urls: [], error: 'Nuk u arrit ngarkimi i fotove.' };
    }
    return { urls };
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      return { urls: [], aborted: true };
    }
    throw error;
  }
}

/**
 * Upload listing images to the shared backend endpoint and return their public
 * URLs. Used by every listing category (real estate, cars, jobs, marketplace,
 * businesses, professionals). The `folder` groups uploads in storage.
 *
 * Images are compressed client-side and uploaded one-by-one so phone camera
 * photos do not exceed Vercel / proxy request body limits.
 */
export async function uploadListingImages(
  files: File[],
  folder = 'listings',
  signal?: AbortSignal,
): Promise<UploadImagesResult> {
  if (!files.length) return { urls: [] };
  try {
    const token = await getAccessToken();
    const prepared: File[] = [];
    const isAvatar = String(folder).toLowerCase() === 'avatars';
    for (const file of files) {
      if (signal?.aborted) return { urls: [], aborted: true };
      if (!file.type.startsWith('image/') && file.type !== '' && file.type !== 'application/octet-stream') {
        continue;
      }
      prepared.push(
        isAvatar ? await prepareAvatarForUpload(file) : await prepareImageForUpload(file),
      );
      if (signal?.aborted) return { urls: [], aborted: true };
    }
    if (!prepared.length) {
      return { urls: [], error: 'Lejohen vetëm foto JPEG, PNG, WEBP dhe GIF.' };
    }

    const urls: string[] = [];
    for (const file of prepared) {
      if (signal?.aborted) return { urls, aborted: true };
      const up = await uploadOneImage(file, folder, token, signal);
      if (up.aborted || signal?.aborted) return { urls, aborted: true };
      if (up.error) {
        return { urls, error: up.error };
      }
      urls.push(...up.urls);
    }
    return { urls };
  } catch {
    if (signal?.aborted) return { urls: [], aborted: true };
    return { urls: [], error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export function isOurStorageUrl(url: string): boolean {
  return (
    /\/storage\/v1\/object\/public\/uploads\//i.test(url) ||
    /\.public\.blob\.vercel-storage\.com\//i.test(url)
  );
}

/**
 * Copy remote (e.g. AI-scraped) image URLs into our storage via the backend.
 * Already-hosted KuTaGjej URLs are returned as-is without re-uploading.
 */
export async function mirrorRemoteImageUrls(
  urls: string[],
  folder = 'listings',
): Promise<UploadImagesResult> {
  const cleaned = urls.map((u) => String(u || '').trim()).filter((u) => /^https?:\/\//i.test(u));
  if (!cleaned.length) return { urls: [] };

  // Fast path: everything already on our CDN.
  if (cleaned.every(isOurStorageUrl)) {
    return { urls: cleaned };
  }

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(getApiUrl('/uploads/from-urls'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ urls: cleaned, folder }),
    });

    const raw = await res.text();
    let data: { message?: unknown; urls?: unknown } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = {};
    }

    if (!res.ok) {
      if (typeof data.message === 'string' && data.message.trim()) {
        return { urls: [], error: data.message };
      }
      return { urls: [], error: 'Nuk u arrit ngarkimi i fotove nga linku.' };
    }

    const out = Array.isArray(data.urls) ? (data.urls as string[]) : [];
    if (!out.length) {
      return { urls: [], error: 'Nuk u arrit ngarkimi i fotove nga linku.' };
    }
    return { urls: out };
  } catch {
    return { urls: [], error: 'Nuk u arrit lidhja me serverin.' };
  }
}
