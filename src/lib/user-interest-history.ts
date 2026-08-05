import type { HomeVerticalId } from '@/lib/home-categories';
import type { ListingMetricKind } from '@/lib/listing-metrics';

const VIEWS_KEY = 'kutagjej-recently-viewed';
const SEARCHES_KEY = 'kutagjej-search-interest';
const MAX_VIEWS = 40;
const MAX_SEARCHES = 30;
/** Drop signals older than this when scoring. */
const INTEREST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type ViewedListingInterest = {
  kind: ListingMetricKind;
  verticalId: HomeVerticalId;
  listingId: string;
  city?: string;
  category?: string;
  at: number;
};

export type SearchInterest = {
  verticalId: HomeVerticalId;
  q?: string;
  city?: string;
  category?: string;
  at: number;
};

export const METRIC_KIND_TO_VERTICAL: Record<ListingMetricKind, HomeVerticalId> = {
  'real-estate': 'real-estate',
  car: 'cars',
  job: 'jobs',
  marketplace: 'marketplace',
  businesses: 'businesses',
  professionals: 'professionals',
};

function readJson<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function normalizeToken(value: string | undefined | null): string | undefined {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || undefined;
}

function isFresh(at: number, now = Date.now()): boolean {
  return Number.isFinite(at) && now - at < INTEREST_TTL_MS;
}

export function getRecentlyViewed(limit = MAX_VIEWS): ViewedListingInterest[] {
  const now = Date.now();
  return readJson<ViewedListingInterest>(VIEWS_KEY)
    .filter((item) => item?.listingId && item?.kind && isFresh(item.at, now))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

export function getSearchInterest(limit = MAX_SEARCHES): SearchInterest[] {
  const now = Date.now();
  return readJson<SearchInterest>(SEARCHES_KEY)
    .filter((item) => item?.verticalId && isFresh(item.at, now))
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

/** Persist a listing detail view for homepage recommendations. */
export function recordListingView(input: {
  kind: ListingMetricKind;
  listingId: string;
  city?: string | null;
  category?: string | null;
}): void {
  const listingId = normalizeToken(input.listingId);
  if (!listingId) return;
  const verticalId = METRIC_KIND_TO_VERTICAL[input.kind];
  if (!verticalId) return;

  const next: ViewedListingInterest = {
    kind: input.kind,
    verticalId,
    listingId,
    city: normalizeToken(input.city),
    category: normalizeToken(input.category),
    at: Date.now(),
  };

  const existing = getRecentlyViewed().filter(
    (item) => !(item.kind === next.kind && item.listingId === next.listingId),
  );
  writeJson(VIEWS_KEY, [next, ...existing].slice(0, MAX_VIEWS));
}

/** Persist a search / browse signal for homepage recommendations. */
export function recordSearchInterest(input: {
  verticalId: HomeVerticalId;
  q?: string | null;
  city?: string | null;
  category?: string | null;
}): void {
  const verticalId = input.verticalId;
  if (!verticalId) return;

  const next: SearchInterest = {
    verticalId,
    q: normalizeToken(input.q),
    city: normalizeToken(input.city),
    category: normalizeToken(input.category),
    at: Date.now(),
  };

  // Skip empty bare category visits that duplicate the latest identical signal within 2 minutes.
  const existing = getSearchInterest();
  const last = existing[0];
  if (
    last &&
    last.verticalId === next.verticalId &&
    (last.q ?? '') === (next.q ?? '') &&
    (last.city ?? '') === (next.city ?? '') &&
    (last.category ?? '') === (next.category ?? '') &&
    next.at - last.at < 2 * 60 * 1000
  ) {
    return;
  }

  writeJson(SEARCHES_KEY, [next, ...existing].slice(0, MAX_SEARCHES));
}

export type InterestProfile = {
  hasSignals: boolean;
  verticalScores: Partial<Record<HomeVerticalId, number>>;
  topVerticals: HomeVerticalId[];
  preferredCities: string[];
  preferredQueries: string[];
  preferredCategories: Partial<Record<HomeVerticalId, string>>;
  viewedKeys: Set<string>;
};

function recencyWeight(at: number, now: number): number {
  const ageDays = Math.max(0, (now - at) / (24 * 60 * 60 * 1000));
  return Math.max(0.15, 1 / (1 + ageDays / 3));
}

/** Aggregate local views + searches into ranked vertical / city / query preferences. */
export function buildInterestProfile(): InterestProfile {
  const now = Date.now();
  const views = getRecentlyViewed();
  const searches = getSearchInterest();
  const verticalScores: Partial<Record<HomeVerticalId, number>> = {};
  const cityScores = new Map<string, number>();
  const queryScores = new Map<string, string>();
  const queryWeight = new Map<string, number>();
  const categoryScores: Partial<Record<HomeVerticalId, Map<string, number>>> = {};
  const viewedKeys = new Set<string>();

  const bumpVertical = (verticalId: HomeVerticalId, weight: number) => {
    verticalScores[verticalId] = (verticalScores[verticalId] ?? 0) + weight;
  };

  const bumpCity = (city: string | undefined, weight: number) => {
    if (!city) return;
    cityScores.set(city, (cityScores.get(city) ?? 0) + weight);
  };

  const bumpQuery = (q: string | undefined, weight: number) => {
    if (!q) return;
    const key = q.toLowerCase();
    const prev = queryWeight.get(key) ?? 0;
    if (weight >= prev) {
      queryScores.set(key, q);
      queryWeight.set(key, weight);
    } else {
      queryWeight.set(key, prev + weight * 0.25);
    }
  };

  const bumpCategory = (verticalId: HomeVerticalId, category: string | undefined, weight: number) => {
    if (!category) return;
    const map = categoryScores[verticalId] ?? new Map<string, number>();
    map.set(category, (map.get(category) ?? 0) + weight);
    categoryScores[verticalId] = map;
  };

  for (const view of views) {
    const w = recencyWeight(view.at, now) * 1.4;
    viewedKeys.add(`${view.kind}:${view.listingId}`);
    bumpVertical(view.verticalId, w);
    bumpCity(view.city, w);
    bumpCategory(view.verticalId, view.category, w);
  }

  for (const search of searches) {
    const w = recencyWeight(search.at, now) * (search.q || search.city || search.category ? 2 : 1);
    bumpVertical(search.verticalId, w);
    bumpCity(search.city, w);
    bumpQuery(search.q, w);
    bumpCategory(search.verticalId, search.category, w);
  }

  const topVerticals = (Object.entries(verticalScores) as [HomeVerticalId, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const preferredCities = [...cityScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([city]) => city)
    .slice(0, 3);

  const preferredQueries = [...queryWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => queryScores.get(key)!)
    .filter(Boolean)
    .slice(0, 3);

  const preferredCategories: Partial<Record<HomeVerticalId, string>> = {};
  for (const [verticalId, map] of Object.entries(categoryScores) as [
    HomeVerticalId,
    Map<string, number>,
  ][]) {
    const best = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) preferredCategories[verticalId] = best[0];
  }

  return {
    hasSignals: topVerticals.length > 0,
    verticalScores,
    topVerticals,
    preferredCities,
    preferredQueries,
    preferredCategories,
    viewedKeys,
  };
}
