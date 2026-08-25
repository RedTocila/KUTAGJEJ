import type { ListingCategoryKey } from '@/types/listing-category';

const STORAGE_PREFIX = 'kutagjej-listing-form-draft:';

export type ListingFormDraft = {
  v: 1;
  category: ListingCategoryKey;
  form: Record<string, unknown>;
  existingImageUrls: string[];
  extra?: Record<string, unknown>;
  savedAt: number;
};

const fileCache = new Map<string, File[]>();
const extraFileCache = new Map<string, Record<string, File[]>>();

export function listingFormDraftKey(category: ListingCategoryKey): string {
  return `${STORAGE_PREFIX}${category}`;
}

const DEFAULT_SKIP_KEYS = new Set([
  'currency',
  'locationMode',
  'contactPhone',
  'cityId',
  'zoneId',
  'cityName',
  'id',
  'status',
  'createdAt',
  'updatedAt',
  'imageUrls',
  'responseTimeHours',
]);

/** True when the user (or AI) has filled more than known profile/location defaults. */
export function listingFormHasUserProgress(
  snapshot: Record<string, unknown> | null | undefined,
  extra?: { existingImageUrls?: string[]; images?: File[] },
): boolean {
  if (extra?.images && extra.images.length > 0) return true;
  if (extra?.existingImageUrls && extra.existingImageUrls.some(Boolean)) return true;
  if (!snapshot) return false;
  if (Array.isArray(snapshot.imageUrls) && snapshot.imageUrls.some(Boolean)) return true;

  for (const [key, value] of Object.entries(snapshot)) {
    if (DEFAULT_SKIP_KEYS.has(key)) continue;
    if (typeof value === 'string' && value.trim()) return true;
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) return true;
    if (Array.isArray(value) && value.some((item) => (typeof item === 'string' ? item.trim() : Boolean(item)))) {
      return true;
    }
    if (typeof value === 'boolean' && value) return true;
  }
  return false;
}

export function mergeCreateFormState<T extends object>(current: T, patch: T): T {
  const next: Record<string, unknown> = { ...(current as Record<string, unknown>) };

  for (const [key, value] of Object.entries(patch)) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'boolean' && value === false) continue;
    if (typeof value === 'number' && value === 0) {
      const cur = next[key];
      if (cur != null && cur !== '' && cur !== 0 && cur !== '0') continue;
    }
    if (value === '0') {
      const cur = next[key];
      if (typeof cur === 'string' && cur.trim() && cur.trim() !== '0') continue;
    }
    next[key] = value;
  }

  return next as T;
}

export function pickNonEmptyString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

export function mergeImageUrls(current: string[], fromAi: string[], max: number): string[] {
  if (!fromAi.length) return current;
  const seen = new Set(current);
  const next = [...current];
  for (const url of fromAi) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    next.push(url);
    if (next.length >= max) break;
  }
  return next;
}

export function readListingFormDraft(category: ListingCategoryKey): ListingFormDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(listingFormDraftKey(category));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ListingFormDraft>;
    if (parsed?.v !== 1 || parsed.category !== category || !parsed.form || typeof parsed.form !== 'object') {
      return null;
    }
    return {
      v: 1,
      category,
      form: parsed.form,
      existingImageUrls: Array.isArray(parsed.existingImageUrls)
        ? parsed.existingImageUrls.filter((u): u is string => typeof u === 'string' && Boolean(u))
        : [],
      extra: parsed.extra && typeof parsed.extra === 'object' ? parsed.extra : undefined,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function saveListingFormDraft(draft: ListingFormDraft): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(listingFormDraftKey(draft.category), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearListingFormDraft(category: ListingCategoryKey): void {
  fileCache.delete(category);
  extraFileCache.delete(category);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(listingFormDraftKey(category));
  } catch {
    /* ignore */
  }
}

export function cacheDraftFiles(category: ListingCategoryKey, files: File[]): void {
  fileCache.set(category, files);
}

export function takeDraftFiles(category: ListingCategoryKey): File[] {
  return fileCache.get(category) ?? [];
}

export function cacheDraftExtraFiles(category: ListingCategoryKey, files: Record<string, File[]>): void {
  extraFileCache.set(category, files);
}

export function takeDraftExtraFiles(category: ListingCategoryKey): Record<string, File[]> {
  return extraFileCache.get(category) ?? {};
}
