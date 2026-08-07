export const paths = {
  home: '/',
  /** Public-facing browse pages — wired from the homepage and footer. */
  public: {
    realEstate: '/prona',
    cars: '/makina',
    jobs: '/pune',
    marketplace: '/tregu',
    /** Short-lived OKAZION deals across all categories. */
    okazion: '/okazion',
    /** Business listings (lokal, zyrë, shërbime biznesi). */
    businesses: '/biznese',
    /** Professionals & freelance services. */
    professionals: '/profesioniste',
    /** Full-page search: pick category, then query + results. */
    search: '/kerko',
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
    /** AI link → listing draft importer. */
    aiImport: '/user/dashboard/ai-import',
    /** Immovable property — add listing (individual / business portal). */
    realEstateListing: '/user/dashboard/prona',
    businessesListing: '/user/dashboard/biznese',
    /** Dedicated business menu editor: `?id=` optional (defaults to the user's business). */
    businessMenu: '/user/dashboard/biznese/menu',
    professionalsListing: '/user/dashboard/profesioniste',
    /** Listings the user has posted (portal). */
    myRealEstateListings: '/user/dashboard/shpalljet-e-mia',
    /** Listing performance: totals + per-post views / leads. */
    statistics: '/user/dashboard/statistikat',
    /** Edit an existing listing: `?kind=&id=`. */
    editListing: '/user/dashboard/shpalljet-e-mia/ndrysho',
    /** Bookmarked listings from across the platform. */
    savedListings: '/user/dashboard/te-ruajturat',
    /** In-app messages tied to listings. */
    messages: '/user/dashboard/mesazhet',
    /** In-app notification inbox. */
    notifications: '/user/dashboard/njoftimet',
    /** Notification preference toggles. */
    notificationSettings: '/user/dashboard/njoftimet/cilesimet',
    /** Referral program — invite link and stats. */
    referral: '/user/dashboard/referral',
    /** Buy boost credits with POK Payments. */
    credits: '/user/dashboard/kredite',
    /** Full-page POK checkout (credits or subscription). */
    checkout: '/user/dashboard/checkout',
    /** @deprecated Hub removed — redirects to dashboard. Prefer packagesMain / packagesExtra / packagesCredits. */
    packages: '/user/dashboard/paketat',
    /** Main subscription plans. */
    packagesMain: '/user/dashboard/paketat/kryesore',
    /** Add-on packages (auto-refresh, premium, convert). */
    packagesExtra: '/user/dashboard/paketat/shtese',
    /** Boost Coins purchase. */
    packagesCredits: '/user/dashboard/paketat/boost-coins',
    /** The user's own payments + active subscriptions. */
    payments: '/user/dashboard/pagesat',
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
    /** All payments across the platform (platform admin only). */
    payments: '/dashboard/pagesat',
    /** Boost-credit packages catalog (platform admin only). */
    creditPackages: '/dashboard/paketat-kredite',
    /** Referral rewards program (all users); numbers editable by platform admin. */
    referral: '/dashboard/referral',
    /** Admin view: who referred whom, credits awarded. */
    referralTracking: '/dashboard/referral-tracking',
    /** Punë — employer verification requests (platform admin). */
    jobEmployerVerification: '/dashboard/verifikimet-pune',
    professionalVerification: '/dashboard/verifikimet-profesioniste',
    /** Listing moderation queue (platform admin). */
    listingModeration: '/dashboard/njoftimet',
    /** Homepage hero carousel banners (platform admin). */
    homeBanners: '/dashboard/bannerat',
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

/** Public seller / member profile: `/anetares/{id}`. */
export function pathsPublicMemberProfile(id: string): string {
  const seg = String(id ?? '').trim();
  if (!seg) return '/anetares/';
  return `/anetares/${encodeURIComponent(seg)}`;
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
 * Prefer server `permalinkPath`; fall back to legacy bare id (handled by `[permalink]` resolver).
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

/** Full menu page for a business: `/biznese/{permalink}/menu`. */
export function listingBusinessMenuHref(entry: { permalinkPath?: string | null; id: string }): string {
  return `${listingBusinessPublicHref(entry).replace(/\/$/, '')}/menu`;
}

export function listingProfessionalPublicHref(entry: { permalinkPath?: string | null; id: string }): string {
  const raw = typeof entry.permalinkPath === 'string' ? entry.permalinkPath.trim() : '';
  if (raw) return pathsPublicVerticalListingDetail(paths.public.professionals, raw);
  return pathsPublicVerticalListingDetail(paths.public.professionals, entry.id);
}

/**
 * Prefer server `permalinkPath`; fall back to legacy bare id (handled by `[permalink]` resolver).
 */
export function listingRealEstatePublicHref(entry: { permalinkPath?: string | null; id: string }): string {
  const raw = typeof entry.permalinkPath === 'string' ? entry.permalinkPath.trim() : '';
  if (raw) return pathsPublicRealEstateListingDetail(raw);
  return `/prona/${encodeURIComponent(entry.id.replace(/\s+/g, ''))}`;
}

