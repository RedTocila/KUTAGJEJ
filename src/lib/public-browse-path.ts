import { paths } from '@/paths';

/** Public category browse roots (and legacy aliases). */
const PUBLIC_BROWSE_ROOTS = [
  paths.public.realEstate,
  paths.public.cars,
  paths.public.jobs,
  paths.public.marketplace,
  paths.public.okazion,
  paths.public.businesses,
  paths.public.professionals,
  '/pasuri-te-paluajtshme',
  '/automjete',
] as const;

/**
 * True for public category browse list URLs (`/pune`, `/prona`, …), not listing
 * detail pages (`/pune/slug-id.html`). Used by the mobile search FAB active state.
 */
export function isPublicBrowsePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_BROWSE_ROOTS.some((base) => pathname === base);
}
