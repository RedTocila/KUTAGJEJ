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
  updatedAt?: string;
}
