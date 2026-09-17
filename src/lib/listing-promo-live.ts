import { isJobListingVisible } from '@/lib/job-listing-expiry';

/** Fields used for live Premium / Okazion demotion and job visibility. */
export type LivePromoListing = {
  id: string;
  kind?: string;
  createdAt?: string;
  bumpedAt?: string | null;
  expiresAt?: string | null;
  isPremium?: boolean;
  premiumUntil?: string | null;
  isOkazion?: boolean;
  okazionUntil?: string | null;
};

export function isUntilActive(until: string | Date | null | undefined, nowMs: number = Date.now()): boolean {
  if (!until) return false;
  const ms = until instanceof Date ? until.getTime() : new Date(until).getTime();
  return Number.isFinite(ms) && ms > nowMs;
}

/** Live Okazion / Premium flags — expired windows demote without waiting for a refetch. */
export function livePromoFlags(
  listing: Pick<LivePromoListing, 'isPremium' | 'premiumUntil' | 'isOkazion' | 'okazionUntil'>,
  nowMs: number = Date.now()
): { isOkazion: boolean; isPremium: boolean } {
  const isOkazion =
    listing.okazionUntil != null && String(listing.okazionUntil).length > 0
      ? isUntilActive(listing.okazionUntil, nowMs)
      : Boolean(listing.isOkazion);
  const isPremium =
    listing.premiumUntil != null && String(listing.premiumUntil).length > 0
      ? isUntilActive(listing.premiumUntil, nowMs)
      : Boolean(listing.isPremium);
  return {
    isOkazion,
    // Okazion outranks premium chrome when both windows exist.
    isPremium: isOkazion ? false : isPremium,
  };
}

export function withLivePromoFlags<T extends LivePromoListing>(listing: T, nowMs: number = Date.now()): T {
  const flags = livePromoFlags(listing, nowMs);
  if (listing.isOkazion === flags.isOkazion && listing.isPremium === flags.isPremium) return listing;
  return { ...listing, ...flags };
}

/** Job stays in public feeds only while its 15-day post/bump window is open. */
export function isPublicJobListed(
  listing: Pick<LivePromoListing, 'createdAt' | 'bumpedAt' | 'expiresAt' | 'premiumUntil' | 'okazionUntil'>,
  nowMs: number = Date.now()
): boolean {
  if (!listing.createdAt) {
    if (listing.expiresAt) {
      const ms = new Date(listing.expiresAt).getTime();
      return Number.isFinite(ms) && ms > nowMs;
    }
    return true;
  }
  return isJobListingVisible(
    listing.createdAt,
    {
      expiresAt: listing.expiresAt,
      bumpedAt: listing.bumpedAt,
      premiumUntil: listing.premiumUntil,
      okazionUntil: listing.okazionUntil,
    },
    new Date(nowMs)
  );
}

function listingBumpMs(listing: LivePromoListing): number {
  const raw = listing.bumpedAt ?? listing.createdAt ?? null;
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Stable partition matching backend `prioritizeActivePremium`:
 * active Okazion → active Premium → free (each tier by bump time).
 */
export function prioritizeLivePremium<T extends LivePromoListing>(
  listings: T[],
  nowMs: number = Date.now()
): T[] {
  if (!Array.isArray(listings) || listings.length <= 1) return listings;
  const okazion: T[] = [];
  const premium: T[] = [];
  const rest: T[] = [];
  for (const listing of listings) {
    const flags = livePromoFlags(listing, nowMs);
    if (flags.isOkazion) okazion.push(listing);
    else if (flags.isPremium) premium.push(listing);
    else rest.push(listing);
  }
  const byBump = (a: T, b: T) => listingBumpMs(b) - listingBumpMs(a);
  return [...okazion.sort(byBump), ...premium.sort(byBump), ...rest.sort(byBump)];
}

export type LiveFeedOptions = {
  /** Drop jobs whose visibility timer has ended. */
  dropExpiredJobs?: boolean;
  /** Drop listings whose Okazion window has ended (Okazion shelf). */
  dropExpiredOkazion?: boolean;
};

function isJobRow(listing: LivePromoListing): boolean {
  return listing.kind === 'job' || (listing.kind == null && Boolean(listing.expiresAt));
}

/** Apply live demotion, optional expiry drops, and Okazion → Premium → free order. */
export function applyLiveFeedListings<T extends LivePromoListing>(
  listings: T[],
  nowMs: number = Date.now(),
  options: LiveFeedOptions = {}
): T[] {
  const { dropExpiredJobs = false, dropExpiredOkazion = false } = options;
  let next = listings;
  if (dropExpiredJobs) {
    next = next.filter((listing) => (isJobRow(listing) ? isPublicJobListed(listing, nowMs) : true));
  }
  if (dropExpiredOkazion) {
    next = next.filter((listing) => isUntilActive(listing.okazionUntil, nowMs));
  }
  return prioritizeLivePremium(
    next.map((listing) => withLivePromoFlags(listing, nowMs)),
    nowMs
  );
}

/** Fingerprint so parents only re-render when membership / promo tier / order changes. */
export function liveFeedFingerprint<T extends LivePromoListing>(
  listings: T[],
  nowMs: number = Date.now(),
  options: LiveFeedOptions = {}
): string {
  return applyLiveFeedListings(listings, nowMs, options)
    .map((listing) => {
      const flags = livePromoFlags(listing, nowMs);
      const tier = flags.isOkazion ? 'o' : flags.isPremium ? 'p' : 'f';
      return `${listing.id}:${tier}`;
    })
    .join('|');
}
