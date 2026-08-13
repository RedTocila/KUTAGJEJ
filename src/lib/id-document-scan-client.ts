'use client';

import { authHeadersAsync } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export interface IdDocumentScanAiResult {
  isIdCard: boolean;
  rejectReason?: string | null;
  message?: string | null;
  idNumber?: string | null;
  documentType?: string | null;
}

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.82;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) reject(new Error('Nuk u lexua fotoja.'));
      else resolve(result);
    };
    reader.onerror = () => reject(new Error('Nuk u lexua fotoja.'));
    reader.readAsDataURL(file);
  });
}

/** Shrink camera photos before sending to the vision API. */
export async function compressIdScanImage(file: File): Promise<string> {
  const source = await readFileAsDataUrl(file);
  if (typeof window === 'undefined' || typeof document === 'undefined') return source;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Nuk u lexua fotoja.'));
    el.src = source;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const isJpeg = /^image\/jpe?g$/i.test(file.type);
  if (scale >= 1 && isJpeg && file.size < 220_000) return source;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

async function parseScanError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (res.status === 401) return 'Duhet të identifikoheni përsëri.';
  if (res.status === 503) return 'Verifikimi i fotos nuk është i disponueshëm për momentin.';
  if (res.status >= 500) return 'Serveri nuk u përgjigj. Provoni përsëri.';
  return 'Skanimi i ID-së dështoi. Provoni përsëri.';
}

/** Validate that the photo is a real ID card and optionally read the ID number. */
export async function scanIdDocumentWithAi(file: File): Promise<{
  result?: IdDocumentScanAiResult;
  error?: string;
}> {
  try {
    const image = await compressIdScanImage(file);
    const res = await fetch(getApiUrl('/professional-verification/scan-id-front'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ image }),
    });
    if (!res.ok) return { error: await parseScanError(res) };
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return { error: 'Përgjigje e pavlefshme nga serveri.' };
    return { result: data as IdDocumentScanAiResult };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}
