'use client';

import { authHeadersAsync } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type ResolvedMapsLocation = {
  mapsUrl: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
  placeQuery?: string | null;
};

/** Expand a Google Maps share URL and extract pin + street label. */
export async function resolveListingMapsUrl(mapsUrl: string): Promise<ResolvedMapsLocation & { error?: string }> {
  try {
    const res = await fetch(getApiUrl('/listings/resolve-maps-url'), {
      method: 'POST',
      headers: await authHeadersAsync(),
      body: JSON.stringify({ mapsUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        mapsUrl: null,
        locationLat: null,
        locationLng: null,
        locationAddress: null,
        error: typeof data.message === 'string' ? data.message : 'Linku i Google Maps nuk u lexua.',
      };
    }
    return {
      mapsUrl: data.mapsUrl ?? null,
      locationLat: typeof data.locationLat === 'number' ? data.locationLat : null,
      locationLng: typeof data.locationLng === 'number' ? data.locationLng : null,
      locationAddress: typeof data.locationAddress === 'string' ? data.locationAddress : null,
      placeQuery: typeof data.placeQuery === 'string' ? data.placeQuery : null,
    };
  } catch {
    return {
      mapsUrl: null,
      locationLat: null,
      locationLng: null,
      locationAddress: null,
      error: 'Nuk u arrit lidhja me serverin.',
    };
  }
}
