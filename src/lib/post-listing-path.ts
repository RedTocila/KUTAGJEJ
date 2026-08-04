import { paths } from '@/paths';

function pathMatches(pathname: string | null, base: string): boolean {
  return pathname === base || Boolean(pathname?.startsWith(`${base}/`));
}

/**
 * Create-listing / AI Build routes — use close (X) instead of profile back link,
 * and keep the mobile bottom-nav Home tab selected.
 */
export function isPostListingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathMatches(pathname, paths.user.realEstateListing) ||
    pathMatches(pathname, paths.user.aiImport) ||
    pathMatches(pathname, paths.user.businessesListing) ||
    pathMatches(pathname, paths.user.professionalsListing) ||
    pathMatches(pathname, '/user/dashboard/pasuri-te-paluajtshme') ||
    pathMatches(pathname, '/user/dashboard/makina') ||
    pathMatches(pathname, '/user/dashboard/pune') ||
    pathMatches(pathname, '/user/dashboard/tregu')
  );
}
