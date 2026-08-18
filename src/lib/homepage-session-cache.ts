import type { HomepageLatestVerticalId, PublicListingsBundle } from '@/lib/public-listings-client';

const STORAGE_KEY = 'kutagjej:home-listings:v2';
const MAX_AGE_MS = 10 * 60 * 1000;

const EMPTY_BUNDLE: PublicListingsBundle = {
  realEstate: [],
  cars: [],
  jobs: [],
  marketplace: [],
  businesses: [],
  professionals: [],
  okazion: [],
  okazionTotal: 0,
  totals: { realEstate: 0, cars: 0, jobs: 0, marketplace: 0, businesses: 0, professionals: 0 },
};

type Stored = { at: number; bundle: PublicListingsBundle };

let memory: PublicListingsBundle | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeHomepageListingsCache(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getHomepageListingsCacheServerSnapshot(): PublicListingsBundle | null {
  return null;
}

export function getHomepageListingsCacheSnapshot(): PublicListingsBundle | null {
  if (memory) return memory;
  memory = readSession();
  return memory;
}

export function homepageBundleHasListings(bundle: PublicListingsBundle): boolean {
  return (
    bundle.realEstate.length > 0 ||
    bundle.cars.length > 0 ||
    bundle.jobs.length > 0 ||
    bundle.marketplace.length > 0 ||
    bundle.businesses.length > 0 ||
    bundle.professionals.length > 0 ||
    bundle.okazion.length > 0
  );
}

export function sliceHomepageVertical(
  bundle: PublicListingsBundle,
  verticalId: HomepageLatestVerticalId,
  limit: number
): { listings: unknown[]; total: number } {
  const slices = {
    'real-estate': { listings: bundle.realEstate, total: bundle.totals.realEstate },
    cars: { listings: bundle.cars, total: bundle.totals.cars },
    jobs: { listings: bundle.jobs, total: bundle.totals.jobs },
    marketplace: { listings: bundle.marketplace, total: bundle.totals.marketplace },
    businesses: { listings: bundle.businesses, total: bundle.totals.businesses },
    professionals: { listings: bundle.professionals, total: bundle.totals.professionals },
  } as const;
  const slice = slices[verticalId];
  return { listings: slice.listings.slice(0, limit), total: slice.total };
}

export function patchHomepageVertical(
  verticalId: HomepageLatestVerticalId,
  listings: unknown[],
  total = 0,
): void {
  const totalsPatch =
    total > 0
      ? {
          realEstate: verticalId === 'real-estate' ? total : undefined,
          cars: verticalId === 'cars' ? total : undefined,
          jobs: verticalId === 'jobs' ? total : undefined,
          marketplace: verticalId === 'marketplace' ? total : undefined,
          businesses: verticalId === 'businesses' ? total : undefined,
          professionals: verticalId === 'professionals' ? total : undefined,
        }
      : undefined;
  const totals = totalsPatch
    ? Object.fromEntries(Object.entries(totalsPatch).filter(([, v]) => typeof v === 'number')) as PublicListingsBundle['totals']
    : undefined;
  patchHomepageListingsCache({
    ...(verticalId === 'real-estate' ? { realEstate: listings as PublicListingsBundle['realEstate'] } : {}),
    ...(verticalId === 'cars' ? { cars: listings as PublicListingsBundle['cars'] } : {}),
    ...(verticalId === 'jobs' ? { jobs: listings as PublicListingsBundle['jobs'] } : {}),
    ...(verticalId === 'marketplace' ? { marketplace: listings as PublicListingsBundle['marketplace'] } : {}),
    ...(verticalId === 'businesses' ? { businesses: listings as PublicListingsBundle['businesses'] } : {}),
    ...(verticalId === 'professionals' ? { professionals: listings as PublicListingsBundle['professionals'] } : {}),
    ...(totals ? { totals } : {}),
  });
}

export function writeHomepageListingsCache(bundle: PublicListingsBundle): void {
  patchHomepageListingsCache(bundle);
}

/** Merge a partial homepage payload so recommended / OKAZION / lazy rows can update independently. */
export function patchHomepageListingsCache(patch: Partial<PublicListingsBundle>): void {
  const prev = getHomepageListingsCacheSnapshot() ?? EMPTY_BUNDLE;
  const next: PublicListingsBundle = {
    realEstate: patch.realEstate ?? prev.realEstate,
    cars: patch.cars ?? prev.cars,
    jobs: patch.jobs ?? prev.jobs,
    marketplace: patch.marketplace ?? prev.marketplace,
    businesses: patch.businesses ?? prev.businesses,
    professionals: patch.professionals ?? prev.professionals,
    okazion: patch.okazion ?? prev.okazion,
    okazionTotal: patch.okazionTotal ?? prev.okazionTotal,
    totals: mergeTotals(prev.totals, patch.totals),
  };
  if (!homepageBundleHasListings(next)) return;
  memory = next;
  if (typeof window !== 'undefined') {
    try {
      const stored: Stored = { at: Date.now(), bundle: next };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // quota / private mode
    }
  }
  emit();
}

function mergeTotals(
  prev: PublicListingsBundle['totals'],
  patch?: PublicListingsBundle['totals'],
): PublicListingsBundle['totals'] {
  if (!patch) return prev;
  const next = { ...prev };
  for (const key of Object.keys(next) as (keyof PublicListingsBundle['totals'])[]) {
    const n = patch[key];
    if (typeof n === 'number' && n > 0) next[key] = n;
  }
  return next;
}

function readSession(): PublicListingsBundle | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.bundle || typeof parsed.at !== 'number') return null;
    if (Date.now() - parsed.at > MAX_AGE_MS) return null;
    if (!homepageBundleHasListings(parsed.bundle)) return null;
    return parsed.bundle;
  } catch {
    return null;
  }
}
