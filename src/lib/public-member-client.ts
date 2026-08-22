import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
  PublicRealEstateListing,
  PublicRealEstateListingSeller,
} from '@/lib/public-listings-client';
import { loadPublicEntity, safeServerJson, type PublicEntityLoadResult } from '@/lib/server-fetch';
import type { HomepageMixedListing } from '@/lib/homepage-latest-listings';

export interface PublicMemberListingsBundle {
  realEstate: PublicRealEstateListing[];
  cars: PublicCarListing[];
  jobs: PublicJobListing[];
  marketplace: PublicMarketplaceListing[];
  businesses: PublicDirectoryListing[];
  professionals: PublicDirectoryListing[];
  totals: {
    realEstate: number;
    cars: number;
    jobs: number;
    marketplace: number;
    businesses: number;
    professionals: number;
    all: number;
  };
}

export type PublicMemberReferralBadgeKind =
  | 'free-tier'
  | 'paid-tier'
  | 'review-tier'
  | 'network-builder'
  | 'revenue-driver'
  | 'trusted-reviewer'
  | 'platform-dominator';

export type PublicMemberReferralBadgeMetric =
  | 'free-referrals'
  | 'paid-referrals'
  | 'reviews'
  | 'combo';

export interface PublicMemberReferralBadge {
  id: string;
  kind: PublicMemberReferralBadgeKind | string;
  label: string;
  description?: string;
  lifetimePercent?: number;
  level?: number;
  /** Whether the member has unlocked this badge. */
  earned: boolean;
  /** What progress this badge tracks. */
  metric?: PublicMemberReferralBadgeMetric | string;
  /** Required count to unlock (referrals, reviews, or combo parts). */
  threshold?: number;
  /** Current progress toward the threshold. */
  progress?: number;
}

/**
 * Canonical badge slots (same order as `resolveReferralBadges`).
 * Used to fill placeholders when the API omits any — e.g. review tiers.
 */
export const DEFAULT_MEMBER_REFERRAL_BADGES: PublicMemberReferralBadge[] = [
  {
    id: 'free-tier-1',
    kind: 'free-tier',
    label: 'Starter',
    description: '1 referim',
    level: 1,
    earned: false,
    metric: 'free-referrals',
    threshold: 1,
    progress: 0,
  },
  {
    id: 'free-tier-2',
    kind: 'free-tier',
    label: 'Active',
    description: '5 referime',
    level: 2,
    earned: false,
    metric: 'free-referrals',
    threshold: 5,
    progress: 0,
  },
  {
    id: 'free-tier-3',
    kind: 'free-tier',
    label: 'Promoter',
    description: '20 referime',
    level: 3,
    earned: false,
    metric: 'free-referrals',
    threshold: 20,
    progress: 0,
  },
  {
    id: 'free-tier-4',
    kind: 'free-tier',
    label: 'Influencer',
    description: '50 referime',
    level: 4,
    earned: false,
    metric: 'free-referrals',
    threshold: 50,
    progress: 0,
  },
  {
    id: 'free-tier-5',
    kind: 'free-tier',
    label: 'Promoter',
    description: '100 referime',
    level: 5,
    earned: false,
    metric: 'free-referrals',
    threshold: 100,
    progress: 0,
  },
  {
    id: 'paid-tier-1',
    kind: 'paid-tier',
    label: 'Starter Promoter',
    description: '1 referim i paguar',
    level: 1,
    earned: false,
    metric: 'paid-referrals',
    threshold: 1,
    progress: 0,
  },
  {
    id: 'paid-tier-2',
    kind: 'paid-tier',
    label: 'Growth Builder',
    description: '5 referime të paguara',
    level: 2,
    earned: false,
    metric: 'paid-referrals',
    threshold: 5,
    progress: 0,
  },
  {
    id: 'paid-tier-3',
    kind: 'paid-tier',
    label: 'Network Power',
    description: '15 referime të paguara',
    level: 3,
    earned: false,
    metric: 'paid-referrals',
    threshold: 15,
    progress: 0,
  },
  {
    id: 'network-builder',
    kind: 'network-builder',
    label: 'Network Builder',
    lifetimePercent: 10,
    earned: false,
    metric: 'free-referrals',
    threshold: 100,
    progress: 0,
  },
  {
    id: 'revenue-driver',
    kind: 'revenue-driver',
    label: 'Revenue Driver',
    lifetimePercent: 5,
    earned: false,
    metric: 'paid-referrals',
    threshold: 15,
    progress: 0,
  },
  {
    id: 'review-tier-10',
    kind: 'review-tier',
    label: '10 Vlerësime',
    description: '10 vlerësime',
    level: 10,
    earned: false,
    metric: 'reviews',
    threshold: 10,
    progress: 0,
  },
  {
    id: 'review-tier-35',
    kind: 'review-tier',
    label: '35 Vlerësime',
    description: '35 vlerësime',
    level: 35,
    earned: false,
    metric: 'reviews',
    threshold: 35,
    progress: 0,
  },
  {
    id: 'review-tier-100',
    kind: 'review-tier',
    label: '100 Vlerësime',
    description: '100 vlerësime',
    level: 100,
    earned: false,
    metric: 'reviews',
    threshold: 100,
    progress: 0,
  },
  {
    id: 'trusted-reviewer',
    kind: 'trusted-reviewer',
    label: 'Trusted',
    lifetimePercent: 5,
    earned: false,
    metric: 'reviews',
    threshold: 100,
    progress: 0,
  },
  {
    id: 'platform-dominator',
    kind: 'platform-dominator',
    label: 'Platform Dominator',
    lifetimePercent: 20,
    earned: false,
    metric: 'combo',
    threshold: 3,
    progress: 0,
  },
];

function normalizeMemberReferralBadge(
  badge: PublicMemberReferralBadge,
  fallback?: PublicMemberReferralBadge,
): PublicMemberReferralBadge {
  return {
    ...(fallback || {}),
    ...badge,
    earned: Boolean(badge.earned),
    threshold:
      typeof badge.threshold === 'number'
        ? badge.threshold
        : fallback?.threshold,
    progress:
      typeof badge.progress === 'number' ? badge.progress : fallback?.progress,
    metric: badge.metric ?? fallback?.metric,
  };
}

/**
 * Overlay API badge state onto the full canonical slot list so review tiers
 * (and any other omitted badges) still appear as locked placeholders.
 */
export function mergeMemberReferralBadges(
  fromApi: PublicMemberReferralBadge[] | undefined | null,
): PublicMemberReferralBadge[] {
  const apiList = Array.isArray(fromApi) ? fromApi : [];
  if (apiList.length === 0) {
    return DEFAULT_MEMBER_REFERRAL_BADGES.map((b) => ({ ...b }));
  }

  const byId = new Map(apiList.map((b) => [String(b.id), b]));
  const defaultIds = new Set(DEFAULT_MEMBER_REFERRAL_BADGES.map((b) => b.id));

  const merged = DEFAULT_MEMBER_REFERRAL_BADGES.map((fallback) => {
    const from = byId.get(fallback.id);
    return from ? normalizeMemberReferralBadge(from, fallback) : { ...fallback };
  });

  for (const badge of apiList) {
    const id = String(badge.id);
    if (defaultIds.has(id)) continue;
    merged.push(normalizeMemberReferralBadge(badge));
  }

  return merged;
}

export interface PublicMemberProfile {
  member: PublicRealEstateListingSeller;
  listings: PublicMemberListingsBundle;
  badges: PublicMemberReferralBadge[];
}

/** Compact public profile row returned by `GET /public/members?q=`. */
export interface PublicMemberSearchHit {
  id: string;
  kind: 'individual' | 'business';
  displayName: string | null;
  avatarUrl: string | null;
  memberSince: string;
  verified: boolean;
  trustBadge: boolean;
  businessOwner: string | null;
  businessCategory: string | null;
  cityName: string | null;
  ratingAverage: number | null;
  reviewCount: number;
}

export interface PublicMemberSearchResult {
  members: PublicMemberSearchHit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  ok: boolean;
}

const EMPTY_LISTINGS: PublicMemberListingsBundle = {
  realEstate: [],
  cars: [],
  jobs: [],
  marketplace: [],
  businesses: [],
  professionals: [],
  totals: {
    realEstate: 0,
    cars: 0,
    jobs: 0,
    marketplace: 0,
    businesses: 0,
    professionals: 0,
    all: 0,
  },
};

function mapMemberProfilePayload(payload: unknown): PublicMemberProfile | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as {
    member?: PublicRealEstateListingSeller;
    listings?: PublicMemberListingsBundle;
    badges?: PublicMemberReferralBadge[];
  };
  if (!data.member) return null;
  return {
    member: data.member,
    badges: mergeMemberReferralBadges(data.badges),
    listings: data.listings
      ? {
          realEstate: data.listings.realEstate ?? [],
          cars: data.listings.cars ?? [],
          jobs: data.listings.jobs ?? [],
          marketplace: data.listings.marketplace ?? [],
          businesses: data.listings.businesses ?? [],
          professionals: data.listings.professionals ?? [],
          totals: {
            ...EMPTY_LISTINGS.totals,
            ...data.listings.totals,
            all:
              data.listings.totals?.all ??
              (data.listings.totals?.realEstate ?? 0) +
                (data.listings.totals?.cars ?? 0) +
                (data.listings.totals?.jobs ?? 0) +
                (data.listings.totals?.marketplace ?? 0) +
                (data.listings.totals?.businesses ?? 0) +
                (data.listings.totals?.professionals ?? 0),
          },
        }
      : EMPTY_LISTINGS,
  };
}

export async function loadPublicMemberProfile(
  id: string,
): Promise<PublicEntityLoadResult<PublicMemberProfile>> {
  return loadPublicEntity(`/public/members/${encodeURIComponent(id)}`, mapMemberProfilePayload);
}

export async function fetchPublicMemberProfile(id: string): Promise<PublicMemberProfile | null> {
  return (await loadPublicMemberProfile(id)).data;
}

/** Latest public member profiles (homepage slider) — same payload as search without `q`. */
export async function fetchLatestPublicMembers(limit = 8): Promise<PublicMemberSearchResult> {
  return fetchPublicMemberSearch('', limit, 1);
}

export async function fetchPublicMemberSearch(
  query: string,
  limit = 24,
  page = 1,
): Promise<PublicMemberSearchResult> {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) params.set('q', trimmed);
  params.set('limit', String(limit));
  params.set('page', String(page));
  // Client fetch cannot use `next.revalidate` (server-only). Skip it with no-store.
  const data = await safeServerJson<{
    members?: PublicMemberSearchHit[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(`/public/members?${params.toString()}`, typeof window !== 'undefined' ? { cache: 'no-store' } : undefined);
  if (!data) {
    return { members: [], total: 0, page, limit, totalPages: 1, ok: false };
  }
  const members = Array.isArray(data.members) ? data.members.map(normalizePublicMemberSearchHit) : [];
  const total = data.total ?? members.length;
  const resolvedLimit = data.limit ?? limit;
  return {
    members,
    total,
    page: data.page ?? page,
    limit: resolvedLimit,
    totalPages: data.totalPages ?? Math.max(1, Math.ceil(total / resolvedLimit) || 1),
    ok: true,
  };
}

function normalizePublicMemberSearchHit(row: PublicMemberSearchHit): PublicMemberSearchHit {
  const raw = row as PublicMemberSearchHit & { display_name?: string | null };
  const displayName = String(row.displayName || raw.display_name || '').trim() || null;
  return { ...row, displayName };
}

/** Newest listings across all member verticals, merged and sorted by `createdAt`. */
export function buildMemberMixedListings(bundle: PublicMemberListingsBundle): HomepageMixedListing[] {
  const items: HomepageMixedListing[] = [
    ...bundle.realEstate.map((listing) => ({ kind: 'real-estate' as const, listing, createdAt: listing.createdAt })),
    ...bundle.cars.map((listing) => ({ kind: 'cars' as const, listing, createdAt: listing.createdAt })),
    ...bundle.jobs.map((listing) => ({ kind: 'jobs' as const, listing, createdAt: listing.createdAt })),
    ...bundle.marketplace.map((listing) => ({ kind: 'marketplace' as const, listing, createdAt: listing.createdAt })),
    ...bundle.businesses.map((listing) => ({ kind: 'businesses' as const, listing, createdAt: listing.createdAt })),
    ...bundle.professionals.map((listing) => ({
      kind: 'professionals' as const,
      listing,
      createdAt: listing.createdAt,
    })),
  ];

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function memberInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}
