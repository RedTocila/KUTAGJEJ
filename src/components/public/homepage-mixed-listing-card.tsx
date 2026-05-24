import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import type { HomepageMixedListing } from '@/lib/homepage-latest-listings';

export function HomepageMixedListingCard({ item }: { item: HomepageMixedListing }) {
  switch (item.kind) {
    case 'real-estate':
      return <RealEstateCard listing={item.listing} />;
    case 'cars':
      return <CarCard listing={item.listing} />;
    case 'jobs':
      return <JobCard listing={item.listing} />;
    case 'marketplace':
      return <MarketplaceCard listing={item.listing} />;
    case 'businesses':
    case 'professionals':
      return <DirectoryListingCard listing={item.listing} />;
    default:
      return null;
  }
}

export function mixedListingKey(item: HomepageMixedListing): string {
  return `${item.kind}-${item.listing.id}`;
}
