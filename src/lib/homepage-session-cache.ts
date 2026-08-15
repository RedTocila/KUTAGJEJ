import type { HomepageLatestVerticalId, PublicListingsBundle } from '@/lib/public-listings-client';

const STORAGE_KEY = 'kutagjej:home-listings:v1';
const MAX_AGE_MS = 10 * 60 * 1000;

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

export function writeHomepageListingsCache(bundle: PublicListingsBundle): void {
  if (!homepageBundleHasListings(bundle)) return;
  memory = bundle;
  if (typeof window !== 'undefined') {
    try {
      const stored: Stored = { at: Date.now(), bundle };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // quota / private mode
    }
  }
  emit();
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
