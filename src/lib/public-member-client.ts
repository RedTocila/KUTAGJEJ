import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
  PublicRealEstateListing,
  PublicRealEstateListingSeller,
} from '@/lib/public-listings-client';
import { safeServerJson } from '@/lib/server-fetch';
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
  | 'network-builder'
  | 'revenue-driver'
  | 'trusted-reviewer'
  | 'platform-dominator';

export interface PublicMemberReferralBadge {
  id: string;
  kind: PublicMemberReferralBadgeKind | string;
  label: string;
  description?: string;
  lifetimePercent?: number;
  level?: number;
  /** Whether the member has unlocked this badge. */
  earned: boolean;
}

/** Fallback slots so the profile always shows badge placeholders if the API omits them. */
export const DEFAULT_MEMBER_REFERRAL_BADGES: PublicMemberReferralBadge[] = [
  { id: 'free-tier-1', kind: 'free-tier', label: 'Starter', description: '1 referim', level: 1, earned: false },
  { id: 'free-tier-2', kind: 'free-tier', label: 'Active', description: '5 referime', level: 2, earned: false },
  { id: 'free-tier-3', kind: 'free-tier', label: 'Promoter', description: '20 referime', level: 3, earned: false },
  { id: 'free-tier-4', kind: 'free-tier', label: 'Influencer', description: '50 referime', level: 4, earned: false },
  { id: 'free-tier-5', kind: 'free-tier', label: 'Promoter', description: '100 referime', level: 5, earned: false },
  {
    id: 'network-builder',
    kind: 'network-builder',
    label: 'Network Builder',
    lifetimePercent: 10,
    earned: false,
  },
  {
    id: 'paid-tier-1',
    kind: 'paid-tier',
    label: 'Starter Promoter',
    description: '1 referim i paguar',
    level: 1,
    earned: false,
  },
  {
    id: 'paid-tier-2',
    kind: 'paid-tier',
    label: 'Growth Builder',
    description: '5 referime të paguara',
    level: 2,
    earned: false,
  },
  {
    id: 'paid-tier-3',
    kind: 'paid-tier',
    label: 'Network Power',
    description: '15 referime të paguara',
    level: 3,
    earned: false,
  },
  {
    id: 'revenue-driver',
    kind: 'revenue-driver',
    label: 'Revenue Driver',
    lifetimePercent: 5,
    earned: false,
  },
  {
    id: 'trusted-reviewer',
    kind: 'trusted-reviewer',
    label: 'Trusted',
    lifetimePercent: 5,
    earned: false,
  },
  {
    id: 'platform-dominator',
    kind: 'platform-dominator',
    label: 'Platform Dominator',
    lifetimePercent: 20,
    earned: false,
  },
];

export function mergeMemberReferralBadges(
  fromApi: PublicMemberReferralBadge[] | undefined | null,
): PublicMemberReferralBadge[] {
  if (Array.isArray(fromApi) && fromApi.length > 0) {
    return fromApi.map((b) => ({ ...b, earned: Boolean(b.earned) }));
  }
  return DEFAULT_MEMBER_REFERRAL_BADGES.map((b) => ({ ...b }));
}

export interface PublicMemberProfile {
  member: PublicRealEstateListingSeller;
  listings: PublicMemberListingsBundle;
  badges: PublicMemberReferralBadge[];
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

export async function fetchPublicMemberProfile(id: string): Promise<PublicMemberProfile | null> {
  const data = await safeServerJson<{
    member: PublicRealEstateListingSeller;
    listings?: PublicMemberListingsBundle;
    badges?: PublicMemberReferralBadge[];
  }>(`/public/members/${encodeURIComponent(id)}`);
  if (!data?.member) return null;
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
