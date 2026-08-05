import type { HomeVerticalId } from '@/lib/home-categories';
import type { HomepageMixedListing } from '@/lib/homepage-latest-listings';
import type { BrowseFilters, BrowseVerticalFilters } from '@/lib/listing-filters';
import {
  fetchBrowseBusinesses,
  fetchBrowseCars,
  fetchBrowseJobs,
  fetchBrowseMarketplace,
  fetchBrowseProfessionals,
  fetchBrowseRealEstate,
  type PublicCarListing,
  type PublicDirectoryListing,
  type PublicJobListing,
  type PublicMarketplaceListing,
  type PublicRealEstateListing,
} from '@/lib/public-listings-client';
import {
  buildInterestProfile,
  METRIC_KIND_TO_VERTICAL,
  type InterestProfile,
} from '@/lib/user-interest-history';

const FETCH_PER_VERTICAL = 8;

function listingKey(kind: HomepageMixedListing['kind'], id: string): string {
  return `${kind}:${id}`;
}

function metricKeyForMixed(item: HomepageMixedListing): string {
  const metricKind =
    item.kind === 'cars' ? 'car' : item.kind === 'jobs' ? 'job' : item.kind;
  return `${metricKind}:${item.listing.id}`;
}

function cityOf(item: HomepageMixedListing): string | undefined {
  const city = 'cityName' in item.listing ? item.listing.cityName : null;
  return city?.trim() || undefined;
}

function categoryOf(item: HomepageMixedListing): string | undefined {
  switch (item.kind) {
    case 'real-estate':
      return item.listing.propertyCategory || undefined;
    case 'cars':
      return item.listing.make || undefined;
    case 'jobs':
      return item.listing.industry || undefined;
    case 'marketplace':
      return item.listing.category || undefined;
    case 'businesses':
    case 'professionals':
      return item.listing.category || undefined;
    default:
      return undefined;
  }
}

function toMixed(
  verticalId: HomeVerticalId,
  listings: Array<
    | PublicRealEstateListing
    | PublicCarListing
    | PublicJobListing
    | PublicMarketplaceListing
    | PublicDirectoryListing
  >,
): HomepageMixedListing[] {
  switch (verticalId) {
    case 'real-estate':
      return (listings as PublicRealEstateListing[]).map((listing) => ({
        kind: 'real-estate' as const,
        listing,
        createdAt: listing.createdAt,
      }));
    case 'cars':
      return (listings as PublicCarListing[]).map((listing) => ({
        kind: 'cars' as const,
        listing,
        createdAt: listing.createdAt,
      }));
    case 'jobs':
      return (listings as PublicJobListing[]).map((listing) => ({
        kind: 'jobs' as const,
        listing,
        createdAt: listing.createdAt,
      }));
    case 'marketplace':
      return (listings as PublicMarketplaceListing[]).map((listing) => ({
        kind: 'marketplace' as const,
        listing,
        createdAt: listing.createdAt,
      }));
    case 'businesses':
      return (listings as PublicDirectoryListing[]).map((listing) => ({
        kind: 'businesses' as const,
        listing,
        createdAt: listing.createdAt,
      }));
    case 'professionals':
      return (listings as PublicDirectoryListing[]).map((listing) => ({
        kind: 'professionals' as const,
        listing,
        createdAt: listing.createdAt,
      }));
    default:
      return [];
  }
}

function filtersForVertical(verticalId: HomeVerticalId, profile: InterestProfile): BrowseVerticalFilters {
  const city = profile.preferredCities[0];
  const q = profile.preferredQueries[0];
  const category = profile.preferredCategories[verticalId];

  switch (verticalId) {
    case 'real-estate':
      return {
        city,
        q,
        cat: category,
      };
    case 'cars':
      return {
        city,
        q,
        make: category,
      };
    case 'jobs':
      return {
        city,
        q,
        industry: category,
      };
    case 'marketplace':
      return {
        city,
        q,
        cat: category,
      };
    case 'businesses':
    case 'professionals':
      return {
        city,
        q,
        type: category,
      };
    default:
      return { city, q };
  }
}

async function fetchVerticalCandidates(
  verticalId: HomeVerticalId,
  profile: InterestProfile,
): Promise<HomepageMixedListing[]> {
  const filters = filtersForVertical(verticalId, profile);
  const hasNarrowFilters = Boolean(
    filters.city ||
      ('q' in filters && filters.q) ||
      ('cat' in filters && filters.cat) ||
      ('make' in filters && filters.make) ||
      ('industry' in filters && filters.industry) ||
      ('type' in filters && filters.type),
  );

  const fetchOnce = async (f: BrowseFilters) => {
    switch (verticalId) {
      case 'real-estate':
        return toMixed(verticalId, (await fetchBrowseRealEstate(FETCH_PER_VERTICAL, f)).listings);
      case 'cars':
        return toMixed(verticalId, (await fetchBrowseCars(FETCH_PER_VERTICAL, f)).listings);
      case 'jobs':
        return toMixed(verticalId, (await fetchBrowseJobs(FETCH_PER_VERTICAL, f)).listings);
      case 'marketplace':
        return toMixed(verticalId, (await fetchBrowseMarketplace(FETCH_PER_VERTICAL, f)).listings);
      case 'businesses':
        return toMixed(verticalId, (await fetchBrowseBusinesses(FETCH_PER_VERTICAL, f)).listings);
      case 'professionals':
        return toMixed(verticalId, (await fetchBrowseProfessionals(FETCH_PER_VERTICAL, f)).listings);
      default:
        return [];
    }
  };

  let items = await fetchOnce(filters);
  // If narrow filters return too few, widen to vertical-only so the strip stays full.
  if (hasNarrowFilters && items.length < 3) {
    const broader = await fetchOnce({});
    const seen = new Set(items.map((i) => listingKey(i.kind, i.listing.id)));
    for (const item of broader) {
      const key = listingKey(item.kind, item.listing.id);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= FETCH_PER_VERTICAL) break;
    }
  }
  return items;
}

function scoreItem(item: HomepageMixedListing, profile: InterestProfile): number {
  const verticalScore = profile.verticalScores[item.kind] ?? 0;
  let score = verticalScore;

  const city = cityOf(item);
  if (city && profile.preferredCities.includes(city)) {
    score += 4 - profile.preferredCities.indexOf(city);
  }

  const category = categoryOf(item);
  const preferredCategory = profile.preferredCategories[item.kind];
  if (category && preferredCategory && category === preferredCategory) {
    score += 2.5;
  }

  const q = profile.preferredQueries[0]?.toLowerCase();
  if (q) {
    const listing = item.listing as unknown as Record<string, unknown>;
    const hay = [listing.title, listing.make, listing.model, listing.description, listing.category]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .join(' ')
      .toLowerCase();
    if (hay.includes(q)) score += 3;
  }

  // Prefer fresher listings slightly within the same interest bucket.
  const ageMs = Date.now() - new Date(item.createdAt).getTime();
  const ageDays = Number.isFinite(ageMs) ? ageMs / (24 * 60 * 60 * 1000) : 30;
  score += Math.max(0, 1.5 - ageDays / 14);

  // Soft-penalize already-viewed so recommendations feel fresh, but keep them if supply is thin.
  if (profile.viewedKeys.has(metricKeyForMixed(item))) {
    score -= 1.25;
  }

  return score;
}

/**
 * Build a personalized mixed strip from local view/search history.
 * Returns null when there are no signals (caller should keep SSR latest).
 */
export async function fetchHomepageRecommendations(
  limit = 8,
  fallback: HomepageMixedListing[] = [],
): Promise<HomepageMixedListing[] | null> {
  const profile = buildInterestProfile();
  if (!profile.hasSignals) return null;

  const verticals = profile.topVerticals.slice(0, 3);
  const batches = await Promise.all(verticals.map((v) => fetchVerticalCandidates(v, profile)));
  const merged = batches.flat();

  const ranked = [...merged].sort((a, b) => scoreItem(b, profile) - scoreItem(a, profile));
  const seen = new Set<string>();
  const out: HomepageMixedListing[] = [];

  for (const item of ranked) {
    const key = listingKey(item.kind, item.listing.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) return out;
  }

  for (const item of fallback) {
    const key = listingKey(item.kind, item.listing.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }

  return out;
}

export function verticalFromMetricKind(kind: keyof typeof METRIC_KIND_TO_VERTICAL): HomeVerticalId {
  return METRIC_KIND_TO_VERTICAL[kind];
}
