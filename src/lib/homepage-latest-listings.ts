import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicListingsBundle,
  PublicMarketplaceListing,
  PublicRealEstateListing,
} from '@/lib/public-listings-client';

export type HomepageMixedListing =
  | { kind: 'real-estate'; listing: PublicRealEstateListing; createdAt: string }
  | { kind: 'cars'; listing: PublicCarListing; createdAt: string }
  | { kind: 'jobs'; listing: PublicJobListing; createdAt: string }
  | { kind: 'marketplace'; listing: PublicMarketplaceListing; createdAt: string }
  | { kind: 'businesses'; listing: PublicDirectoryListing; createdAt: string }
  | { kind: 'professionals'; listing: PublicDirectoryListing; createdAt: string };

/** Newest listings across all homepage verticals, merged and sorted by `createdAt`. */
export function buildHomepageMixedLatest(
  bundle: PublicListingsBundle,
  limit = 8,
): HomepageMixedListing[] {
  const items: HomepageMixedListing[] = [
    ...bundle.realEstate.map((listing) => ({ kind: 'real-estate' as const, listing, createdAt: listing.createdAt })),
    ...bundle.cars.map((listing) => ({ kind: 'cars' as const, listing, createdAt: listing.createdAt })),
    ...bundle.jobs.map((listing) => ({ kind: 'jobs' as const, listing, createdAt: listing.createdAt })),
    ...bundle.marketplace.map((listing) => ({ kind: 'marketplace' as const, listing, createdAt: listing.createdAt })),
    ...bundle.businesses.map((listing) => ({ kind: 'businesses' as const, listing, createdAt: listing.createdAt })),
    ...bundle.professionals.map((listing) => ({ kind: 'professionals' as const, listing, createdAt: listing.createdAt })),
  ];

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
