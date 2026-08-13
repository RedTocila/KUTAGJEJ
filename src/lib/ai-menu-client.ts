import { clientFetch } from '@/lib/api-client';
import type { BusinessMenuCategory, BusinessMenuItem } from '@/lib/directory-listings-client';

export interface AiMenuImportResult {
  categories: BusinessMenuCategory[];
  items: BusinessMenuItem[];
  error?: string;
}

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

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

/** Shrink large camera photos before sending to the vision API. */
async function compressImageFile(file: File): Promise<string> {
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

/** Analyze menu photo(s) with AI and return editable categories/items. */
export async function importMenuFromImages(files: File[]): Promise<AiMenuImportResult> {
  if (!files.length) {
    return { categories: [], items: [], error: 'Zgjidhni të paktën një foto.' };
  }

  try {
    const images = await Promise.all(files.slice(0, 20).map((file) => compressImageFile(file)));
    const res = await clientFetch<{
      categories?: BusinessMenuCategory[];
      items?: BusinessMenuItem[];
      message?: string;
    }>('/ai/import-menu', {
      method: 'POST',
      body: JSON.stringify({ images }),
    });

    if (!res.ok) {
      return { categories: [], items: [], error: res.error || 'Analiza e menusë dështoi.' };
    }

    return {
      categories: Array.isArray(res.data?.categories) ? res.data.categories : [],
      items: Array.isArray(res.data?.items) ? res.data.items : [],
    };
  } catch {
    return { categories: [], items: [], error: 'Nuk u arrit lidhja me serverin.' };
  }
}
