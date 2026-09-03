import type { HomepageMixedListing } from '@/lib/homepage-latest-listings';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import type { ListingCardRatingSummary } from '@/components/public/listing-cards/listing-card-rating';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';

export function HomepageMixedListingCard({
  item,
  sellerRating = null,
  imagePriority = false,
  compact = false,
  homepage = false,
}: {
  item: HomepageMixedListing;
  /** Shown on profile listing grids (falls back when the listing has no own reviews). */
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  /** Dense browse-style cards (e.g. member profile grid). */
  compact?: boolean;
  /** Homepage carousel layout with specs, posted date, and views. */
  homepage?: boolean;
}) {
  const sellableVariant = homepage ? 'homepage' : compact ? 'compact' : 'default';

  switch (item.kind) {
    case 'real-estate':
      return (
        <RealEstateCard
          listing={item.listing}
          sellerRating={sellerRating}
          imagePriority={imagePriority}
          variant={sellableVariant}
        />
      );
    case 'cars':
      return (
        <CarCard
          listing={item.listing}
          sellerRating={sellerRating}
          imagePriority={imagePriority}
          variant={sellableVariant}
        />
      );
    case 'jobs':
      return (
        <JobCard
          listing={item.listing}
          sellerRating={sellerRating}
          imagePriority={imagePriority}
          variant={sellableVariant}
        />
      );
    case 'marketplace':
      return (
        <MarketplaceCard
          listing={item.listing}
          sellerRating={sellerRating}
          imagePriority={imagePriority}
          variant={sellableVariant}
        />
      );
    case 'businesses':
    case 'professionals':
      return (
        <DirectoryListingCard
          listing={item.listing}
          sellerRating={sellerRating}
          variant={homepage ? 'homepage' : compact ? 'compact' : 'default'}
          showActionCounts={homepage}
        />
      );
    default:
      return null;
  }
}

export function mixedListingKey(item: HomepageMixedListing): string {
  return `${item.kind}-${item.listing.id}`;
}
