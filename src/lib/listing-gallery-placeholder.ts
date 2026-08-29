import type { AnyPublicListingDetail } from '@/lib/public-listings-client';

/** Serializable — picker maps to a Phosphor icon in `RealEstateListingGallery`. */
export type ListingGalleryPlaceholderKey =
  | 'house'
  | 'buildings'
  | 'car'
  | 'briefcase'
  | 'shopping'
  | 'storefront'
  | 'professional';

/** Hero placeholder when a listing has no photos — matches the listing vertical. */
export function listingDetailGalleryPlaceholder(listing: AnyPublicListingDetail): ListingGalleryPlaceholderKey {
  switch (listing.kind) {
    case 'car':
      return 'car';
    case 'job':
      return 'briefcase';
    case 'marketplace':
      return 'shopping';
    case 'businesses':
      return 'storefront';
    case 'professionals':
      return 'professional';
    default:
      return 'house';
  }
}
