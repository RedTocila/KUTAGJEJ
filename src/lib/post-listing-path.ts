import type { ListingCategoryKey } from '@/types/listing-category';
import { paths } from '@/paths';

function pathMatches(pathname: string | null, base: string): boolean {
  return pathname === base || Boolean(pathname?.startsWith(`${base}/`));
}

/**
 * Create-listing / AI Build routes — use close (X) instead of profile back link.
 */
export function isPostListingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathMatches(pathname, paths.user.realEstateListing) ||
    pathMatches(pathname, paths.user.aiImport) ||
    pathMatches(pathname, paths.user.businessesListing) ||
    pathMatches(pathname, paths.user.professionalsListing) ||
    pathMatches(pathname, '/user/dashboard/pasuri-te-paluajtshme') ||
    pathMatches(pathname, paths.user.carsListing) ||
    pathMatches(pathname, paths.user.jobsListing) ||
    pathMatches(pathname, paths.user.marketplaceListing)
  );
}

/**
 * Category implied by a dedicated post URL (`/user/dashboard/pune` → jobs).
 * Query `?category=` still wins. Hub `/user/dashboard/prona` is not implied.
 */
export function listingCategoryFromPostPath(pathname: string | null): ListingCategoryKey | null {
  if (!pathname) return null;
  if (pathMatches(pathname, paths.user.carsListing)) return 'cars';
  if (pathMatches(pathname, paths.user.jobsListing)) return 'job-listings';
  if (pathMatches(pathname, paths.user.marketplaceListing)) return 'marketplace';
  if (pathMatches(pathname, paths.user.businessesListing)) return 'businesses';
  if (pathMatches(pathname, paths.user.professionalsListing)) return 'professionals';
  return null;
}
