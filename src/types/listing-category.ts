export type ListingCategoryKey = 'real-estate' | 'job-listings' | 'cars' | 'marketplace';

export interface ListingTypeOption {
  slug: string;
  label: string;
}

export interface ListingCategory {
  key: ListingCategoryKey;
  title: string;
  slug: string;
  listingTypes: ListingTypeOption[];
  /** Real-estate only: sub-types for the "Apartment" property category. */
  apartmentTypes?: ListingTypeOption[];
  updatedAt?: string;
}
