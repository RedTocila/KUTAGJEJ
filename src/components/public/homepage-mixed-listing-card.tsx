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
}: {
  item: HomepageMixedListing;
  /** Shown on profile listing grids (falls back when the listing has no own reviews). */
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
  compact?: boolean;
}) {
  switch (item.kind) {
    case 'real-estate':
      return (
        <RealEstateCard
          listing={item.listing}
          sellerRating={sellerRating}
          imagePriority={imagePriority}
          variant={compact ? 'compact' : 'default'}
        />
      );
    case 'cars':
      return (
        <CarCard
          listing={item.listing}
          sellerRating={sellerRating}
          imagePriority={imagePriority}
          variant={compact ? 'compact' : 'default'}
        />
      );
    case 'jobs':
      return (
        <JobCard
          listing={item.listing}
          sellerRating={sellerRating}
          imagePriority={imagePriority}
          variant={compact ? 'compact' : 'homepage'}
        />
      );
    case 'marketplace':
      return (
        <MarketplaceCard
          listing={item.listing}
          sellerRating={sellerRating}
          imagePriority={imagePriority}
          variant={compact ? 'compact' : 'default'}
        />
      );
    case 'businesses':
    case 'professionals':
      return (
        <DirectoryListingCard
          listing={item.listing}
          sellerRating={sellerRating}
          variant={compact ? 'compact' : 'default'}
        />
      );
    default:
      return null;
  }
}

export function mixedListingKey(item: HomepageMixedListing): string {
  return `${item.kind}-${item.listing.id}`;
}
