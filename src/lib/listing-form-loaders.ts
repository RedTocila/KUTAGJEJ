import type { ListingCategoryKey } from '@/types/listing-category';
import { paths } from '@/paths';

/** Per-category loaders so webpack + TypeScript keep each form chunk distinct. */
export const listingFormLoaders = {
  'real-estate': () => import('@/components/real-estate/real-estate-listing-form'),
  cars: () => import('@/components/cars/car-listing-form'),
  'job-listings': () => import('@/components/jobs/job-listing-form'),
  marketplace: () => import('@/components/marketplace/marketplace-listing-form'),
  businesses: () => import('@/components/businesses/business-listing-form'),
  professionals: () => import('@/components/professionals/professional-listing-form'),
};

export function isListingFormCategoryKey(value: string | null | undefined): value is ListingCategoryKey {
  return Boolean(value && value in listingFormLoaders);
}

export function prefetchListingForm(key: ListingCategoryKey): void {
  void listingFormLoaders[key]();
}

export function prefetchPostListingPage(router: { prefetch: (href: string) => void }): void {
  router.prefetch(paths.user.realEstateListing);
}
