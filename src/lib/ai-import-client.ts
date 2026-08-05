import { clientFetch } from '@/lib/api-client';
import type { AiListingDraft } from '@/lib/ai-listing-draft';
import type { ListingCategoryKey } from '@/types/listing-category';

export type AiImageRole = 'cover' | 'profile' | 'gallery' | 'portfolio';

export interface AiImportDraftResult {
  id: string;
  sourceUrl: string;
  category: ListingCategoryKey | null;
  detectedCategory?: ListingCategoryKey | null;
  preferredCategory?: ListingCategoryKey | null;
  title: string;
  summary: string;
  cityName?: string;
  imageUrls: string[];
  imageRoles?: AiImageRole[];
  form: Record<string, unknown>;
  warning?: string | null;
  error?: string | null;
  errorCode?: string | null;
  restrictedReasons?: string[] | null;
  sourcePrompt?: string | null;
}

export const AI_CATEGORY_MISMATCH_CODE = 'category_mismatch';
export const AI_CONTENT_RESTRICTED_CODE = 'content_restricted';

export function isAiCategoryMismatch(
  draft: Pick<AiImportDraftResult, 'error' | 'errorCode'>,
): boolean {
  return (
    draft.errorCode === AI_CATEGORY_MISMATCH_CODE ||
    draft.error === AI_CATEGORY_MISMATCH_CODE
  );
}

export function isAiContentRestricted(
  draft: Pick<AiImportDraftResult, 'error' | 'errorCode'>,
): boolean {
  return (
    draft.errorCode === AI_CONTENT_RESTRICTED_CODE ||
    draft.error === AI_CONTENT_RESTRICTED_CODE
  );
}

/** Clear the mismatch block after the user switches to the detected category. */
export function acceptAiCategoryCorrection(
  draft: AiImportDraftResult,
  nextCategory?: ListingCategoryKey | null,
): AiImportDraftResult | null {
  const category = nextCategory || draft.detectedCategory || draft.category;
  if (!category) return null;
  if (draft.detectedCategory && category !== draft.detectedCategory) {
    // Switching to a non-detected category needs a fresh AI run.
    return null;
  }
  if (!draft.form || Object.keys(draft.form).length === 0) {
    return null;
  }
  return {
    ...draft,
    category,
    detectedCategory: draft.detectedCategory || category,
    preferredCategory: category,
    error: null,
    errorCode: null,
  };
}

export interface AiImportProfileContext {
  accountType?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  businessName?: string | null;
  businessOwner?: string | null;
  businessCategory?: string | null;
  nipt?: string | null;
}

export async function importListingsFromLinks(input: {
  text?: string;
  urls?: string[];
  category?: ListingCategoryKey | null;
  profile?: AiImportProfileContext | null;
  images?: Array<string | { url: string; hint?: string }>;
  mode?: 'create' | 'edit';
  currentListing?: Record<string, unknown> | null;
}): Promise<{ drafts: AiImportDraftResult[]; error?: string }> {
  const res = await clientFetch<{ drafts?: AiImportDraftResult[]; message?: string }>(
    '/ai/import-listings',
    {
      method: 'POST',
      body: JSON.stringify({
        text: input.text ?? '',
        urls: input.urls ?? [],
        ...(input.category ? { category: input.category } : {}),
        ...(input.profile ? { profile: input.profile } : {}),
        ...(input.images?.length ? { images: input.images } : {}),
        ...(input.mode ? { mode: input.mode } : {}),
        ...(input.currentListing ? { currentListing: input.currentListing } : {}),
      }),
    },
  );

  if (!res.ok) {
    return { drafts: [], error: res.error || 'AI import failed' };
  }

  return {
    drafts: Array.isArray(res.data?.drafts) ? res.data.drafts : [],
  };
}

export function toAiListingDraft(draft: AiImportDraftResult): AiListingDraft | null {
  if (!draft.category || draft.error) return null;
  return {
    id: draft.id,
    sourceUrl: draft.sourceUrl,
    category: draft.category,
    title: draft.title,
    summary: draft.summary,
    cityName: draft.cityName,
    imageUrls: draft.imageUrls ?? [],
    imageRoles: draft.imageRoles,
    form: draft.form ?? {},
    warning: draft.warning,
  };
}

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.78;

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      resolve(result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/** Shrink large camera photos before sending as data URLs (vision / fallback). */
async function compressImageFile(file: File): Promise<string | null> {
  const source = await readFileAsDataUrl(file);
  if (!source) return null;
  if (typeof window === 'undefined' || typeof document === 'undefined') return source;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image load failed'));
      el.src = source;
    });

    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    if (scale >= 1 && file.size < 900_000) return source;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return source;
  }
}

/**
 * Prefer already-uploaded https URLs for AI vision.
 * Falls back to compressed data URLs for local files (keeps payloads under proxy limits).
 */
export async function filesToAiImagePayload(
  files: File[],
  hints: string[] = [],
): Promise<Array<{ url: string; hint?: string }>> {
  const out: Array<{ url: string; hint?: string }> = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file || !file.type.startsWith('image/')) continue;
    const url = await compressImageFile(file);
    if (!url) continue;
    out.push({
      url,
      hint: hints[i] || undefined,
    });
  }
  return out;
}

/**
 * Merge uploaded attached-image URLs into AI draft imageUrls using imageRoles.
 * cover first, then profile, then the rest; keep remote scrape URLs after.
 */
export function mergeAttachedImageUrls(input: {
  remoteUrls: string[];
  uploadedUrls: string[];
  roles?: AiImageRole[];
  max?: number;
}): string[] {
  const max = input.max ?? 8;
  const roles = input.roles ?? [];
  const uploaded = input.uploadedUrls.filter(Boolean);
  const remote = input.remoteUrls.filter(Boolean);

  const ordered: string[] = [];
  const used = new Set<number>();

  const pushUploaded = (idx: number) => {
    if (idx < 0 || idx >= uploaded.length || used.has(idx)) return;
    ordered.push(uploaded[idx]);
    used.add(idx);
  };

  const coverIndex = roles.findIndex((r) => r === 'cover');
  const profileIndex = roles.findIndex((r) => r === 'profile');

  if (coverIndex >= 0) pushUploaded(coverIndex);
  else if (uploaded[0]) pushUploaded(0);

  if (profileIndex >= 0) pushUploaded(profileIndex);

  uploaded.forEach((_, idx) => pushUploaded(idx));

  for (const url of remote) {
    if (ordered.length >= max) break;
    if (!ordered.includes(url)) ordered.push(url);
  }

  return ordered.slice(0, max);
}
