import type { ListingCategoryKey } from '@/types/listing-category';
import type { AiListingDraft } from '@/lib/ai-listing-draft';
import { clientFetch } from '@/lib/api-client';

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
  zoneName?: string;
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
export const AI_DAILY_LIMIT_CODE = 'ai_daily_limit';
export const AI_INSUFFICIENT_BC_CODE = 'insufficient_bc';
export const AI_RATE_LIMIT_CODE = 'openai_rate_limit';

const MAX_IMPORT_URLS = 50;

function normalizeImportUrl(raw: string): string | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const withProtocol = hasProtocol ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const host = url.hostname.replace(/\.$/, '').toLowerCase();
    if (!host) return null;
    const isLocalhost = host === 'localhost';
    const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const hasDot = host.includes('.');
    if (!isLocalhost && !isIpv4 && !hasDot) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Pull up to 50 unique http(s) links from pasted text or an explicit list. */
export function extractImportUrls(input: string | string[]): string[] {
  const text = Array.isArray(input) ? input.join('\n') : String(input || '');
  const seen = new Set<string>();
  const urls: string[] = [];

  const push = (candidate: string) => {
    const normalized = normalizeImportUrl(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    urls.push(normalized);
  };

  for (const line of text.split(/[\n,]+/)) {
    if (urls.length >= MAX_IMPORT_URLS) break;
    push(line);
  }

  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  for (const match of matches) {
    if (urls.length >= MAX_IMPORT_URLS) break;
    push(match.replace(/[),.;]+$/, ''));
  }

  return urls;
}

export type AiUsageKind = 'ai_build' | 'ai_assist' | 'ai_menu';

export interface AiUsageEvent {
  id: string;
  kind: AiUsageKind;
  costBc: number;
  units: number;
  sourceLabel?: string | null;
  status: 'charged' | 'refunded';
  createdAt: string;
}

export interface AiUsageSnapshot {
  balance: number;
  costs: {
    aiBuildPerLink: number;
    other: number;
    aiAssist?: number;
    aiMenuPerImage: number;
    aiSearch: number;
  };
  events: AiUsageEvent[];
}

export function isAiDailyLimitError(input: { code?: string | null; error?: string | null; status?: number }): boolean {
  if (input.code === AI_INSUFFICIENT_BC_CODE || input.code === AI_DAILY_LIMIT_CODE) return true;
  if (input.status === 403 && /Boost Coins|AI Build/i.test(String(input.error || ''))) return true;
  return false;
}

export function aiDailyLimitMessage(
  t: {
    aiImport: {
      insufficientBc: string;
    };
  },
  _planCode?: string | null
): string {
  return t.aiImport.insufficientBc;
}

function parseBcCost(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function fetchAiUsage(): Promise<{
  snapshot: AiUsageSnapshot | null;
  error?: string;
}> {
  const res = await clientFetch<AiUsageSnapshot>(
    '/ai/usage',
    {
      method: 'GET',
    },
    5
  );
  if (!res.ok) {
    return { snapshot: null, error: res.error || 'Failed to load AI usage' };
  }
  return {
    snapshot: {
      balance: Number(res.data?.balance) || 0,
      costs: {
        aiBuildPerLink: parseBcCost(res.data?.costs?.aiBuildPerLink, 1),
        other: parseBcCost(res.data?.costs?.other ?? res.data?.costs?.aiAssist, 0.5),
        aiMenuPerImage: parseBcCost(res.data?.costs?.aiMenuPerImage, 1),
        aiSearch: parseBcCost(res.data?.costs?.aiSearch, 0),
      },
      events: Array.isArray(res.data?.events) ? res.data.events : [],
    },
  };
}

export function isAiCategoryMismatch(draft: Pick<AiImportDraftResult, 'error' | 'errorCode'>): boolean {
  return draft.errorCode === AI_CATEGORY_MISMATCH_CODE || draft.error === AI_CATEGORY_MISMATCH_CODE;
}

export function isAiContentRestricted(draft: Pick<AiImportDraftResult, 'error' | 'errorCode'>): boolean {
  return draft.errorCode === AI_CONTENT_RESTRICTED_CODE || draft.error === AI_CONTENT_RESTRICTED_CODE;
}

export function isAiRateLimitError(input: { errorCode?: string | null; error?: string | null }): boolean {
  if (input.errorCode === AI_RATE_LIMIT_CODE) return true;
  return /rate limit reached|tokens per min|\bTPM\b|too many listings at once/i.test(String(input.error || ''));
}

/** Clear the mismatch block after the user switches to the detected category. */
export function acceptAiCategoryCorrection(
  draft: AiImportDraftResult,
  nextCategory?: ListingCategoryKey | null
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
  /** Preferred city from past listings (profile has no city field). */
  preferredCityId?: string | null;
  preferredCityName?: string | null;
}

export async function importListingsFromLinks(input: {
  text?: string;
  urls?: string[];
  category?: ListingCategoryKey | null;
  profile?: AiImportProfileContext | null;
  images?: Array<string | { url: string; hint?: string }>;
  mode?: 'create' | 'edit';
  currentListing?: Record<string, unknown> | null;
  batchId?: string | null;
  batchSize?: number;
  feature?: 'build' | 'assist';
  signal?: AbortSignal;
}): Promise<{
  drafts: AiImportDraftResult[];
  error?: string;
  code?: string;
  status?: number;
  batchId?: string | null;
  boostCredits?: number;
  aborted?: boolean;
}> {
  const res = await clientFetch<{
    drafts?: AiImportDraftResult[];
    message?: string;
    code?: string;
    batchId?: string;
    boostCredits?: number;
  }>('/ai/import-listings', {
    method: 'POST',
    body: JSON.stringify({
      text: input.text ?? '',
      urls: input.urls ?? [],
      ...(input.category ? { category: input.category } : {}),
      ...(input.profile ? { profile: input.profile } : {}),
      ...(input.images?.length ? { images: input.images } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.feature ? { feature: input.feature } : {}),
      ...(input.currentListing ? { currentListing: input.currentListing } : {}),
      ...(input.batchId ? { batchId: input.batchId } : {}),
      ...(input.batchSize ? { batchSize: input.batchSize } : {}),
    }),
    signal: input.signal,
  });

  if (res.aborted || input.signal?.aborted) {
    return { drafts: [], aborted: true, status: 0 };
  }

  if (!res.ok) {
    const code =
      typeof res.data?.code === 'string'
        ? res.data.code
        : isAiDailyLimitError({ error: res.error, status: res.status })
          ? AI_DAILY_LIMIT_CODE
          : undefined;
    return {
      drafts: [],
      error: res.error || 'AI import failed',
      code,
      status: res.status,
      batchId: typeof res.data?.batchId === 'string' ? res.data.batchId : null,
    };
  }

  return {
    drafts: Array.isArray(res.data?.drafts) ? res.data.drafts : [],
    batchId: typeof res.data?.batchId === 'string' ? res.data.batchId : null,
    boostCredits: typeof res.data?.boostCredits === 'number' ? res.data.boostCredits : undefined,
  };
}

export function toAiListingDraft(draft: AiImportDraftResult): AiListingDraft | null {
  if (!draft.category || draft.error) return null;
  const sourcePrompt = draft.sourcePrompt ?? null;
  const isJob = draft.category === 'job-listings';
  const jobCover = isJob
    ? resolveJobAiCover({ prompt: sourcePrompt, imageUrls: draft.imageUrls ?? [] })
    : null;
  const form = { ...(draft.form ?? {}) };
  if (jobCover) {
    form.coverMode = jobCover.coverMode;
  }
  return {
    id: draft.id,
    sourceUrl: draft.sourceUrl,
    category: draft.category,
    title: draft.title,
    summary: draft.summary,
    cityName: draft.cityName,
    zoneName: draft.zoneName,
    imageUrls: jobCover ? jobCover.imageUrls : (draft.imageUrls ?? []),
    imageRoles: draft.imageRoles,
    form,
    warning: draft.warning,
    sourcePrompt,
    coverMode: jobCover?.coverMode,
  };
}

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;

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
    const isJpeg = /^image\/jpe?g$/i.test(file.type);
    if (scale >= 1 && isJpeg && file.size < 180_000) return source;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
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
  hints: string[] = []
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

/**
 * Job images are evidence for OCR by default. Only treat one as the cover when
 * the user explicitly asks for that in the prompt.
 */
export function jobPromptRequestsCoverImage(prompt: string): boolean {
  const normalized = prompt
    .toLocaleLowerCase('sq-AL')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  const mentionsImage = /\b(image|photo|picture|foto|fotografi|imazh)\w*\b/.test(normalized);
  const mentionsCover = /\b(cover|kopertin\w*)\b/.test(normalized);
  const requestsUse = /\b(use|perdor|vendos|set|choose|zgjidh|si|as|for|per)\b/.test(normalized);
  const rejectsCoverUse =
    /\b(didnt|did not|don't|do not|not|without|pa|mos|nuk)\b.{0,60}\b(use|perdor|vendos|set|choose|zgjidh)\b.{0,60}\b(image|photo|picture|foto|fotografi|imazh|cover|kopertin\w*)\b.{0,60}\b(image|photo|picture|foto|fotografi|imazh|cover|kopertin\w*)\b/.test(
      normalized
    );
  if (rejectsCoverUse) return false;
  return mentionsImage && mentionsCover && requestsUse;
}

/** AI Build jobs use the hiring mockup unless the user explicitly asks for a cover photo. */
export function resolveJobAiCover(opts: {
  prompt?: string | null;
  imageUrls?: string[] | null;
}): { coverMode: 'image' | 'mockup'; imageUrls: string[] } {
  const imageUrls = (opts.imageUrls ?? []).filter(Boolean);
  if (jobPromptRequestsCoverImage(opts.prompt ?? '') && imageUrls.length > 0) {
    return { coverMode: 'image', imageUrls };
  }
  return { coverMode: 'mockup', imageUrls: [] };
}
