'use client';

import * as React from 'react';

import { useUser } from '@/hooks/use-user';
import { listMyListings } from '@/lib/listings-client';
import {
  applyEmptyKnownDefaults,
  knownCreateDefaultsFromStorage,
  locationDefaultsFromStorage,
  rememberListingLocation,
  resolveContactPhone,
  type CreateListingKnownDefaults,
  type ListingLocationDefaults,
} from '@/lib/listing-form-defaults';

type DatedCityRow = {
  cityId?: string | null;
  zoneId?: string | null;
  cityName?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function pickNewestWithCity(rows: DatedCityRow[]): ListingLocationDefaults | null {
  let best: { at: number; cityId: string; zoneId: string; cityName: string } | null = null;
  for (const row of rows) {
    const cityId = typeof row.cityId === 'string' ? row.cityId.trim() : '';
    if (!cityId) continue;
    const stamp = Date.parse(row.updatedAt || row.createdAt || '') || 0;
    if (!best || stamp >= best.at) {
      best = {
        at: stamp,
        cityId,
        zoneId: typeof row.zoneId === 'string' ? row.zoneId.trim() : '',
        cityName: typeof row.cityName === 'string' ? row.cityName.trim() : '',
      };
    }
  }
  if (!best) return null;
  return { cityId: best.cityId, zoneId: best.zoneId, cityName: best.cityName, userId: '' };
}

async function resolveLocationFromMine(userId?: string | null): Promise<ListingLocationDefaults> {
  const cached = locationDefaultsFromStorage(userId);
  if (cached.cityId) return { ...cached, userId: userId || cached.userId };

  const mine = await listMyListings();
  if (mine.error) return cached;

  const rows: DatedCityRow[] = [
    ...(mine.realEstate ?? []),
    ...(mine.cars ?? []),
    ...(mine.jobs ?? []),
    ...(mine.marketplace ?? []),
    ...(mine.businesses ?? []),
    ...(mine.professionals ?? []),
  ];
  const picked = pickNewestWithCity(rows);
  if (!picked) return cached;

  rememberListingLocation(picked, userId);
  return { ...picked, userId: userId || '' };
}

/**
 * Known create defaults (phone from profile, city/zone from last listing).
 * Empty-only — safe to re-apply after AI prefill.
 */
export function useCreateListingDefaults(options?: {
  enabled?: boolean;
  withZone?: boolean;
}): {
  defaults: CreateListingKnownDefaults;
  applyTo: <T extends Record<string, unknown>>(form: T) => T;
  rememberLocation: (loc: {
    cityId?: string | null;
    zoneId?: string | null;
    cityName?: string | null;
  }) => void;
} {
  const { user } = useUser();
  const enabled = options?.enabled !== false;
  const withZone = Boolean(options?.withZone);
  const userId = user?.id ?? null;

  const [location, setLocation] = React.useState<ListingLocationDefaults>(() =>
    locationDefaultsFromStorage(userId),
  );

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void resolveLocationFromMine(userId).then((loc) => {
      if (cancelled) return;
      if (loc.cityId) setLocation(loc);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  const defaults = React.useMemo<CreateListingKnownDefaults>(() => {
    const fromStorage = knownCreateDefaultsFromStorage(userId);
    return {
      contactPhone: resolveContactPhone(user) || fromStorage.contactPhone,
      cityId: location.cityId || fromStorage.cityId,
      zoneId: location.zoneId || fromStorage.zoneId,
      cityName: location.cityName || fromStorage.cityName,
    };
  }, [user, userId, location.cityId, location.zoneId, location.cityName]);

  const applyTo = React.useCallback(
    <T extends Record<string, unknown>>(form: T): T =>
      applyEmptyKnownDefaults(form, defaults, { withZone }),
    [defaults, withZone],
  );

  const rememberLocation = React.useCallback(
    (loc: { cityId?: string | null; zoneId?: string | null; cityName?: string | null }) => {
      rememberListingLocation(loc, userId);
      const cityId = typeof loc.cityId === 'string' ? loc.cityId.trim() : '';
      if (!cityId) return;
      setLocation({
        cityId,
        zoneId: typeof loc.zoneId === 'string' ? loc.zoneId.trim() : '',
        cityName: typeof loc.cityName === 'string' ? loc.cityName.trim() : '',
        userId: userId || '',
      });
    },
    [userId],
  );

  return { defaults, applyTo, rememberLocation };
}
