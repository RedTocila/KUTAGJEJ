import { clientFetch } from '@/lib/api-client';
import type { AiListingDraft } from '@/lib/ai-listing-draft';
import type { ListingCategoryKey } from '@/types/listing-category';

export type AiImageRole = 'cover' | 'profile' | 'gallery' | 'portfolio';

export interface AiImportDraftResult {
  id: string;
  sourceUrl: string;
  category: ListingCategoryKey | null;
  title: string;
  summary: string;
  cityName?: string;
  imageUrls: string[];
  imageRoles?: AiImageRole[];
  form: Record<string, unknown>;
  warning?: string | null;
  error?: string | null;
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

/** Read local files as compressed-ish data URLs for vision (max dimension via canvas skip — keep simple). */
export async function filesToAiImagePayload(
  files: File[],
  hints: string[] = [],
): Promise<Array<{ url: string; hint?: string }>> {
  const out: Array<{ url: string; hint?: string }> = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file || !file.type.startsWith('image/')) continue;
    const url = await readFileAsDataUrl(file);
    if (!url) continue;
    out.push({
      url,
      hint: hints[i] || undefined,
    });
  }
  return out;
}

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

  const coverIdx = roles.findIndex((r) => r === 'cover');
  const profileIdx = roles.findIndex((r) => r === 'profile');

  const ordered: string[] = [];
  const used = new Set<number>();

  const pushUploaded = (idx: number) => {
    if (idx < 0 || idx >= uploaded.length || used.has(idx)) return;
    ordered.push(uploaded[idx]);
    used.add(idx);
  };

  if (coverIdx >= 0) pushUploaded(coverIdx);
  else if (uploaded[0]) pushUploaded(0);

  if (profileIdx >= 0) pushUploaded(profileIdx);

  uploaded.forEach((_, idx) => pushUploaded(idx));

  for (const url of remote) {
    if (ordered.length >= max) break;
    if (!ordered.includes(url)) ordered.push(url);
  }

  return ordered.slice(0, max);
}
