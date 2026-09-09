import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import type { HomeBannerDto } from '@/lib/home-banners-client';
import type { PublicMemberSearchHit } from '@/lib/public-member-client';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicListingsBundle,
  PublicMarketplaceListing,
  PublicOkazionListing,
  PublicRealEstateListing,
} from '@/lib/public-listings-client';
import { safeServerJson } from '@/lib/server-fetch';

const HOMEPAGE_REVALIDATE_SECONDS = 300;
const DEFAULT_LIMIT = 8;

export type HomepagePublicPayload = {
  ok: boolean;
  banners: HomeBannerDto[];
  realEstate: PublicRealEstateListing[];
  cars: PublicCarListing[];
  jobs: PublicJobListing[];
  marketplace: PublicMarketplaceListing[];
  businesses: PublicDirectoryListing[];
  professionals: PublicDirectoryListing[];
  okazion: PublicOkazionListing[];
  okazionTotal: number;
  members: PublicMemberSearchHit[];
  membersTotal: number;
  totals: PublicListingsBundle['totals'];
};

const EMPTY_HOMEPAGE: HomepagePublicPayload = {
  ok: false,
  banners: [],
  realEstate: [],
  cars: [],
  jobs: [],
  marketplace: [],
  businesses: [],
  professionals: [],
  okazion: [],
  okazionTotal: 0,
  members: [],
  membersTotal: 0,
  totals: { realEstate: 0, cars: 0, jobs: 0, marketplace: 0, businesses: 0, professionals: 0 },
};

type HomepageApiResponse = {
  banners?: HomeBannerDto[];
  realEstate?: PublicRealEstateListing[];
  cars?: PublicCarListing[];
  jobs?: PublicJobListing[];
  marketplace?: PublicMarketplaceListing[];
  businesses?: PublicDirectoryListing[];
  professionals?: PublicDirectoryListing[];
  okazion?: PublicOkazionListing[];
  okazionTotal?: number;
  members?: PublicMemberSearchHit[];
  membersTotal?: number;
  totals?: PublicListingsBundle['totals'];
};

function normalizeHomepagePayload(data: HomepageApiResponse | null): HomepagePublicPayload {
  if (!data) return EMPTY_HOMEPAGE;
  return {
    ok: true,
    banners: data.banners ?? [],
    realEstate: data.realEstate ?? [],
    cars: data.cars ?? [],
    jobs: data.jobs ?? [],
    marketplace: data.marketplace ?? [],
    businesses: data.businesses ?? [],
    professionals: data.professionals ?? [],
    okazion: data.okazion ?? [],
    okazionTotal: data.okazionTotal ?? 0,
    members: data.members ?? [],
    membersTotal: data.membersTotal ?? 0,
    totals: data.totals ?? EMPTY_HOMEPAGE.totals,
  };
}

const loadHomepagePublicPayload = unstable_cache(
  async (limit: number): Promise<HomepagePublicPayload> => {
    const data = await safeServerJson<HomepageApiResponse>(`/public/homepage?limit=${limit}`);
    // Do not persist cold-API failures in the Data Cache for the full ISR window.
    if (!data) throw new Error('homepage_payload_unavailable');
    return normalizeHomepagePayload(data);
  },
  ['homepage-public-payload'],
  { revalidate: HOMEPAGE_REVALIDATE_SECONDS, tags: ['homepage'] }
);

/**
 * Public homepage data for RSC. Deduped per-request via React `cache`,
 * and ISR-cached across requests via `unstable_cache` (300s).
 * Never includes auth / personalized fields.
 */
export const getHomepagePublicPayload = cache(async function getHomepagePublicPayload(
  limit = DEFAULT_LIMIT
): Promise<HomepagePublicPayload> {
  try {
    return await loadHomepagePublicPayload(limit);
  } catch {
    return EMPTY_HOMEPAGE;
  }
});

export function homepagePayloadToBundle(payload: HomepagePublicPayload): PublicListingsBundle & { ok: boolean } {
  return {
    realEstate: payload.realEstate,
    cars: payload.cars,
    jobs: payload.jobs,
    marketplace: payload.marketplace,
    businesses: payload.businesses,
    professionals: payload.professionals,
    okazion: payload.okazion,
    okazionTotal: payload.okazionTotal,
    totals: payload.totals,
    ok: payload.ok,
  };
}

export { HOMEPAGE_REVALIDATE_SECONDS };
