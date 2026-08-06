import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import type { ListingCardRatingSummary } from '@/components/public/listing-cards/listing-card-rating';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import type { HomepageMixedListing } from '@/lib/homepage-latest-listings';

export function HomepageMixedListingCard({
  item,
  sellerRating = null,
  imagePriority = false,
}: {
  item: HomepageMixedListing;
  /** Shown on profile listing grids (falls back when the listing has no own reviews). */
  sellerRating?: ListingCardRatingSummary | null;
  imagePriority?: boolean;
}) {
  switch (item.kind) {
    case 'real-estate':
      return (
        <RealEstateCard listing={item.listing} sellerRating={sellerRating} imagePriority={imagePriority} />
      );
    case 'cars':
      return <CarCard listing={item.listing} sellerRating={sellerRating} imagePriority={imagePriority} />;
    case 'jobs':
      return <JobCard listing={item.listing} sellerRating={sellerRating} imagePriority={imagePriority} />;
    case 'marketplace':
      return (
        <MarketplaceCard listing={item.listing} sellerRating={sellerRating} imagePriority={imagePriority} />
      );
    case 'businesses':
    case 'professionals':
      return <DirectoryListingCard listing={item.listing} sellerRating={sellerRating} />;
    default:
      return null;
  }
}

export function mixedListingKey(item: HomepageMixedListing): string {
  return `${item.kind}-${item.listing.id}`;
}
