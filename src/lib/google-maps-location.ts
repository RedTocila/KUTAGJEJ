/** Client-side helpers for Google Maps location URLs (no short-link resolve). */

export type ParsedMapsCoords = { lat: number; lng: number };

function parseCoordPair(raw: string | null | undefined): ParsedMapsCoords | null {
  if (!raw) return null;
  const m = String(raw)
    .trim()
    .match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function extractCoordsFromMapsUrl(urlString: string): ParsedMapsCoords | null {
  let url: URL;
  try {
    url = new URL(String(urlString || '').trim());
  } catch {
    return null;
  }

  const href = url.href;

  const at = href.match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  const bang = href.match(/!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  if (bang) {
    const lat = Number(bang[1]);
    const lng = Number(bang[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  for (const key of ['q', 'query', 'll', 'center', 'destination']) {
    const pair = parseCoordPair(url.searchParams.get(key));
    if (pair) return pair;
  }

  const pathPair = url.pathname.match(/(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (pathPair) {
    const lat = Number(pathPair[1]);
    const lng = Number(pathPair[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

/** Place / search text from a Maps URL when coords are not embedded. */
export function extractPlaceQueryFromMapsUrl(urlString: string): string | null {
  let url: URL;
  try {
    url = new URL(String(urlString || '').trim());
  } catch {
    return null;
  }
  for (const key of ['q', 'query', 'destination']) {
    const val = url.searchParams.get(key);
    if (!val) continue;
    if (parseCoordPair(val)) continue;
    const decoded = decodeURIComponent(val.replace(/\+/g, ' ')).trim();
    if (decoded && decoded.length <= 240) return decoded;
  }
  const place = url.pathname.match(/\/place\/([^/]+)/);
  if (place?.[1]) {
    const decoded = decodeURIComponent(place[1].replace(/\+/g, ' ')).trim();
    if (decoded && decoded.length <= 240) return decoded;
  }
  return null;
}

export function looksLikeGoogleMapsUrl(value: string): boolean {
  const raw = String(value || '').trim();
  if (!raw) return true;
  try {
    const url = new URL(raw);
    if (!/^https?:$/i.test(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    return (
      host.includes('google.') ||
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      host.endsWith('.app.goo.gl')
    );
  } catch {
    return false;
  }
}

/** Map query priority: lat/lng pin → Maps place text → zone+city → city. */
export function businessMapLocation(input: {
  locationLat?: number | null;
  locationLng?: number | null;
  mapsUrl?: string | null;
  mapsPlaceQuery?: string | null;
  zoneName?: string | null;
  cityName?: string | null;
}): { lat?: number; lng?: number; query?: string } | null {
  const lat = input.locationLat;
  const lng = input.locationLng;
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return { lat, lng };
  }

  const mapsUrl = String(input.mapsUrl || '').trim();
  if (mapsUrl) {
    const fromUrl = extractCoordsFromMapsUrl(mapsUrl);
    if (fromUrl) return { lat: fromUrl.lat, lng: fromUrl.lng };
  }

  const place =
    String(input.mapsPlaceQuery || '').trim() ||
    (mapsUrl ? extractPlaceQueryFromMapsUrl(mapsUrl) : null);
  if (place) return { query: place };

  const parts = [input.zoneName, input.cityName, 'Shqipëri'].filter(Boolean);
  if (parts.length >= 2) return { query: parts.join(', ') };
  if (input.cityName) return { query: `${input.cityName}, Shqipëri` };
  return null;
}

/** Header line: street/road → neighbourhood (zone) → city. Never Maps business place titles. */
export function businessLocationLine(input: {
  locationAddress?: string | null;
  zoneName?: string | null;
  cityName?: string | null;
}): string | null {
  const street = String(input.locationAddress || '').trim();
  const zone = String(input.zoneName || '').trim();
  const city = String(input.cityName || '').trim();
  const primary = street || zone;
  if (!primary && !city) return null;

  const parts: string[] = [];
  if (primary) parts.push(primary);
  if (city) {
    const alreadyHasCity = primary.toLowerCase().includes(city.toLowerCase());
    if (!alreadyHasCity) parts.push(city);
  }
  parts.push('Shqipëri');
  return parts.join(', ');
}

/** Scroll to the visible business map section (mobile + desktop both mount). */
export function scrollToBusinessLocationMap() {
  if (typeof document === 'undefined') return;
  const nodes = document.querySelectorAll<HTMLElement>('[data-business-location-map]');
  const visible = Array.from(nodes).find((el) => el.getClientRects().length > 0);
  (visible ?? nodes[0])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
