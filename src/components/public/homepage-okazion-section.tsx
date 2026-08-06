import * as React from 'react';

import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection } from '@/components/public/listings-section';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import type { PublicOkazionListing } from '@/lib/public-listings-client';

function OkazionCard({ listing }: { listing: PublicOkazionListing }) {
  switch (listing.kind) {
    case 'real-estate':
      return <RealEstateCard listing={listing} />;
    case 'car':
      return <CarCard listing={listing} />;
    case 'job':
      return <JobCard listing={listing} />;
    case 'marketplace':
      return <MarketplaceCard listing={listing} />;
    default:
      return null;
  }
}

/** Homepage OKAZION strip — active flash deals across sellable categories. */
export function HomepageOkazionSection({
  listings,
  total,
}: {
  listings: PublicOkazionListing[];
  total: number;
}) {
  return (
    <ListingsSection
      verticalId="okazion"
      total={total}
      isEmpty={listings.length === 0}
      titleKey="okazionListings"
      useMuiVerticalIcon
      hideSubcategoryPills
    >
      <ListingsCarousel>
        {listings.map((listing) => (
          <OkazionCard key={`${listing.kind}:${listing.id}`} listing={listing} />
        ))}
      </ListingsCarousel>
    </ListingsSection>
  );
}
