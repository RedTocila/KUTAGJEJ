export const paths = {
  home: '/',
  /** Public-facing browse pages — wired from the homepage and footer. */
  public: {
    realEstate: '/prona',
    cars: '/makina',
    jobs: '/pune',
    marketplace: '/tregu',
    /** Business listings (lokal, zyrë, shërbime biznesi). */
    businesses: '/biznese',
    /** Professionals & freelance services. */
    professionals: '/profesioniste',
    about: '/rreth-nesh',
    terms: '/kushtet',
    privacy: '/privatesia',
    contact: '/kontakt',
  },
  auth: { signIn: '/auth/sign-in' },
  user: {
    auth: '/user/auth',
    dashboard: '/user/dashboard',
    profile: '/user/dashboard/profili',
    /** Immovable property — add listing (individual / business portal). */
    realEstateListing: '/user/dashboard/prona',
    businessesListing: '/user/dashboard/biznese',
    professionalsListing: '/user/dashboard/profesioniste',
    /** Saved real-estate listings for the signed-in user. */
    myRealEstateListings: '/user/dashboard/shpalljet-e-mia',
  },
  dashboard: {
    overview: '/dashboard',
    profile: '/dashboard/profili',
    /** Staff / managed users (platform admin only). */
    staffUsers: '/dashboard/perdoruesit',
    /** Role catalog (platform admin only). */
    roles: '/dashboard/rolet',
    /** Category slugs + listing types per vertical (platform admin only). */
    kategorite: '/dashboard/kategorite',
    /** Cities & zones for real-estate listings (platform admin only). */
    realEstateLocations: '/dashboard/vendndodhjet-pasurie',
    /** Contracts linked to catalog roles (platform admin only). */
    kontratat: '/dashboard/kontratat',
    /** Referral rewards program (all users); numbers editable by platform admin. */
    referral: '/dashboard/referral',
    /** Punë — employer verification requests (platform admin). */
    jobEmployerVerification: '/dashboard/verifikimet-pune',
  },
  app: {},
  errors: {},
} as const;

/** Canonical public URL for real-estate listings: `/prona/{slug}-{mongoId}.html`. */
export function pathsPublicRealEstateListingDetail(permalinkPath: string): string {
  const p = String(permalinkPath ?? '').trim();
  if (!p) return `/prona/`;
  return `/prona/${encodeURIComponent(p)}`;
}

/** `/makina/{segment}`, `/pune/{segment}`, etc. — `segment` is `slug-{id}.html` or legacy id. */
export function pathsPublicVerticalListingDetail(
  basePublicPath: string,
  permalinkPathOrId: string,
): string {
  const base = basePublicPath.replace(/\/$/, '') || '';
  const seg = String(permalinkPathOrId ?? '').trim();
  if (!seg) return `${base}/`;
  return `${base}/${encodeURIComponent(seg)}`;
}

/**
 * Prefer server `permalinkPath`; fall back to legacy bare ObjectId (handled by `[permalink]` resolver).
 */
export function listingCarPublicHref(entry: { permalinkPath?: string | null; id: string }): string {
  const raw = typeof entry.permalinkPath === 'string' ? entry.permalinkPath.trim() : '';
  if (raw) return pathsPublicVerticalListingDetail(paths.public.cars, raw);
  return pathsPublicVerticalListingDetail(paths.public.cars, entry.id);
}

export function listingJobPublicHref(entry: { permalinkPath?: string | null; id: string }): string {
  const raw = typeof entry.permalinkPath === 'string' ? entry.permalinkPath.trim() : '';
  if (raw) return pathsPublicVerticalListingDetail(paths.public.jobs, raw);
  return pathsPublicVerticalListingDetail(paths.public.jobs, entry.id);
}

export function listingMarketplacePublicHref(entry: { permalinkPath?: string | null; id: string }): string {
  const raw = typeof entry.permalinkPath === 'string' ? entry.permalinkPath.trim() : '';
  if (raw) return pathsPublicVerticalListingDetail(paths.public.marketplace, raw);
  return pathsPublicVerticalListingDetail(paths.public.marketplace, entry.id);
}

export function listingBusinessPublicHref(entry: { permalinkPath?: string | null; id: string }): string {
  const raw = typeof entry.permalinkPath === 'string' ? entry.permalinkPath.trim() : '';
  if (raw) return pathsPublicVerticalListingDetail(paths.public.businesses, raw);
  return pathsPublicVerticalListingDetail(paths.public.businesses, entry.id);
}

export function listingProfessionalPublicHref(entry: { permalinkPath?: string | null; id: string }): string {
  const raw = typeof entry.permalinkPath === 'string' ? entry.permalinkPath.trim() : '';
  if (raw) return pathsPublicVerticalListingDetail(paths.public.professionals, raw);
  return pathsPublicVerticalListingDetail(paths.public.professionals, entry.id);
}

/**
 * Prefer server `permalinkPath`; fall back to legacy bare ObjectId (handled by `[permalink]` resolver).
 */
export function listingRealEstatePublicHref(entry: { permalinkPath?: string | null; id: string }): string {
  const raw = typeof entry.permalinkPath === 'string' ? entry.permalinkPath.trim() : '';
  if (raw) return pathsPublicRealEstateListingDetail(raw);
  return `/prona/${encodeURIComponent(entry.id.replace(/\s+/g, ''))}`;
}

