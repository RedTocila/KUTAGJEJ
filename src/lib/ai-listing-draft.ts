import type { ListingCategoryKey } from '@/types/listing-category';

export const AI_LISTING_DRAFT_KEY = 'kutagjej-ai-listing-draft';
export const AI_LISTING_DRAFT_QUEUE_KEY = 'kutagjej-ai-listing-draft-queue';

export interface AiListingDraft {
  id: string;
  sourceUrl: string;
  category: ListingCategoryKey;
  title: string;
  summary: string;
  cityName?: string;
  zoneName?: string;
  imageUrls: string[];
  imageRoles?: Array<'cover' | 'profile' | 'gallery' | 'portfolio'>;
  form: Record<string, unknown>;
  warning?: string | null;
  error?: string | null;
  sourcePrompt?: string | null;
  coverMode?: 'image' | 'mockup';
}

function isCategory(value: unknown): value is ListingCategoryKey {
  return (
    value === 'real-estate' ||
    value === 'cars' ||
    value === 'job-listings' ||
    value === 'marketplace' ||
    value === 'businesses' ||
    value === 'professionals'
  );
}

function isDraft(value: unknown): value is AiListingDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as AiListingDraft;
  return typeof draft.id === 'string' && isCategory(draft.category);
}

function draftSlotKey(id: string): string {
  return `${AI_LISTING_DRAFT_KEY}:${id}`;
}

export function saveAiListingDraft(draft: AiListingDraft): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AI_LISTING_DRAFT_KEY, JSON.stringify(draft));
  sessionStorage.setItem(draftSlotKey(draft.id), JSON.stringify(draft));
}

export function peekAiListingDraft(): AiListingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(AI_LISTING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Read and clear the pending AI draft (once). Prefer draftId when opening one of many. */
export function consumeAiListingDraft(
  expectedCategory?: ListingCategoryKey,
  draftId?: string | null
): AiListingDraft | null {
  if (typeof window === 'undefined') return null;

  if (draftId) {
    try {
      const raw = sessionStorage.getItem(draftSlotKey(draftId));
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isDraft(parsed)) {
          if (expectedCategory && parsed.category !== expectedCategory) return null;
          sessionStorage.removeItem(draftSlotKey(draftId));
          const legacy = peekAiListingDraft();
          if (legacy?.id === draftId) sessionStorage.removeItem(AI_LISTING_DRAFT_KEY);
          return parsed;
        }
      }
    } catch {
      /* fall through */
    }
  }

  const draft = peekAiListingDraft();
  if (!draft) return null;
  if (expectedCategory && draft.category !== expectedCategory) return null;
  if (draftId && draft.id !== draftId) return null;
  sessionStorage.removeItem(AI_LISTING_DRAFT_KEY);
  sessionStorage.removeItem(draftSlotKey(draft.id));
  return draft;
}

export function clearAiListingDraft(): void {
  if (typeof window === 'undefined') return;
  const current = peekAiListingDraft();
  sessionStorage.removeItem(AI_LISTING_DRAFT_KEY);
  if (current?.id) sessionStorage.removeItem(draftSlotKey(current.id));
}

/** Persist the AI Build results list so drafts survive opening a form. */
export function saveAiListingDraftQueue(drafts: AiListingDraft[]): void {
  if (typeof window === 'undefined') return;
  const ready = drafts.filter(isDraft);
  sessionStorage.setItem(AI_LISTING_DRAFT_QUEUE_KEY, JSON.stringify(ready));
}

export function loadAiListingDraftQueue(): AiListingDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(AI_LISTING_DRAFT_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDraft);
  } catch {
    return [];
  }
}

export function removeAiListingDraftFromQueue(draftId: string): AiListingDraft[] {
  const next = loadAiListingDraftQueue().filter((d) => d.id !== draftId);
  saveAiListingDraftQueue(next);
  sessionStorage.removeItem(draftSlotKey(draftId));
  return next;
}

export function clearAiListingDraftQueue(): void {
  if (typeof window === 'undefined') return;
  const existing = loadAiListingDraftQueue();
  for (const draft of existing) {
    sessionStorage.removeItem(draftSlotKey(draft.id));
  }
  sessionStorage.removeItem(AI_LISTING_DRAFT_QUEUE_KEY);
}

export function categoryLabel(category: ListingCategoryKey | null | undefined): string {
  switch (category) {
    case 'real-estate':
      return 'Prona';
    case 'cars':
      return 'Makina';
    case 'job-listings':
      return 'Punë';
    case 'marketplace':
      return 'Tregu';
    case 'businesses':
      return 'Biznese';
    case 'professionals':
      return 'Profesionistë';
    default:
      return 'Njoftim';
  }
}
