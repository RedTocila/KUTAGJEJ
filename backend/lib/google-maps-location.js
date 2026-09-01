'use strict';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAPS_HOST_RE =
  /^(?:www\.)?(?:google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i;

/** Albanian / common street-like labels (not business place titles). */
const STREET_LABEL_RE =
  /^(rruga|rr\.|bulevardi|blvd\.?|sheshi|shëtitorja|lagja|lagjia|rrugica|autostrada|a\d)\b/i;

function isMapsHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host) return false;
  if (MAPS_HOST_RE.test(host)) return true;
  return host.endsWith('.google.com') || host === 'google.com' || host.includes('maps.google.');
}

function isShortMapsUrl(url) {
  const host = String(url.hostname || '').toLowerCase();
  return host === 'maps.app.goo.gl' || host === 'goo.gl' || host.endsWith('.app.goo.gl');
}

function parseCoordPair(raw) {
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

/**
 * Extract lat/lng from a resolved Google Maps URL (no network).
 * @returns {{ lat: number, lng: number } | null}
 */
function extractCoordsFromMapsUrl(urlString) {
  let url;
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
    const val = url.searchParams.get(key);
    const pair = parseCoordPair(val);
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

/**
 * Optional place/query text when coords are missing (for map embed fallback).
 */
function extractPlaceQueryFromMapsUrl(urlString) {
  let url;
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

/** True when label looks like a street / road / square, not a venue title. */
function looksLikeStreetLabel(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 120) return false;
  if (STREET_LABEL_RE.test(raw)) return true;
  // "Something 12" house-number style
  if (/\b\d{1,4}[a-zA-Z]?\b/.test(raw) && raw.split(/\s+/).length <= 6) return true;
  return false;
}

async function resolveShortMapsUrl(urlString, { timeoutMs = 8000 } = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(urlString, {
      method: 'GET',
      redirect: 'follow',
      signal: controller?.signal,
      headers: { 'User-Agent': 'KuTaGjej/1.0 (maps-location)' },
    });
    return res.url || urlString;
  } catch {
    return urlString;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function reverseGeocodeStreet(lat, lng, { timeoutMs = 7000 } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}` +
      `&lon=${encodeURIComponent(String(lng))}&addressdetails=1&zoom=18`;
    const res = await fetch(url, {
      method: 'GET',
      signal: controller?.signal,
      headers: {
        'User-Agent': 'KuTaGjej/1.0 (business-location; contact@kutagjej.al)',
        Accept: 'application/json',
        'Accept-Language': 'sq,en',
      },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const a = data?.address;
    if (!a || typeof a !== 'object') return null;

    const road =
      a.road ||
      a.pedestrian ||
      a.footway ||
      a.path ||
      a.residential ||
      a.cycleway ||
      a.street ||
      null;
    if (road) {
      const house = a.house_number ? ` ${a.house_number}` : '';
      return String(`${road}${house}`).replace(/\s+/g, ' ').trim().slice(0, 160) || null;
    }

    const area =
      a.neighbourhood || a.suburb || a.quarter || a.city_district || a.borough || a.hamlet || null;
    if (area) return String(area).replace(/\s+/g, ' ').trim().slice(0, 160) || null;
    return null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Forward-geocode a free-text address (OpenStreetMap Nominatim).
 * @returns {Promise<{ lat: number, lng: number, displayName: string|null, city: string|null, suburb: string|null } | null>}
 */
async function forwardGeocodeQuery(query, { timeoutMs = 7000 } = {}) {
  const q = String(query || '').trim();
  if (!q || q.length > 240) return null;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1` +
      `&countrycodes=al&q=${encodeURIComponent(q)}&addressdetails=1`;
    const res = await fetch(url, {
      method: 'GET',
      signal: controller?.signal,
      headers: {
        'User-Agent': 'KuTaGjej/1.0 (listing-import; contact@kutagjej.al)',
        Accept: 'application/json',
        'Accept-Language': 'sq,en',
      },
    });
    if (!res.ok) return null;
    const rows = await res.json().catch(() => null);
    const hit = Array.isArray(rows) ? rows[0] : null;
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const a = hit.address && typeof hit.address === 'object' ? hit.address : {};
    const city = a.city || a.town || a.municipality || a.county || a.state || null;
    const suburb = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.borough || null;
    return {
      lat,
      lng,
      displayName: typeof hit.display_name === 'string' ? hit.display_name.trim().slice(0, 240) : null,
      city: city ? String(city).trim() : null,
      suburb: suburb ? String(suburb).trim() : null,
    };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Validate and normalize a pasted Google Maps URL (+ street via reverse geocode when possible).
 * @returns {Promise<{ ok: true, mapsUrl: string|null, locationLat: number|null, locationLng: number|null, placeQuery: string|null, locationAddress: string|null } | { ok: false, message: string }>}
 */
async function parseGoogleMapsLocation(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    return {
      ok: true,
      mapsUrl: null,
      locationLat: null,
      locationLng: null,
      placeQuery: null,
      locationAddress: null,
    };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: 'Linku i Google Maps nuk është i vlefshëm.' };
  }

  if (!/^https?:$/i.test(url.protocol)) {
    return { ok: false, message: 'Linku i Google Maps duhet të fillojë me https://.' };
  }

  if (!isMapsHost(url.hostname)) {
    return { ok: false, message: 'Ngjitni një link të Google Maps (maps.google.com ose maps.app.goo.gl).' };
  }

  let resolved = raw;
  if (isShortMapsUrl(url)) {
    resolved = await resolveShortMapsUrl(raw);
  }

  const coords = extractCoordsFromMapsUrl(resolved) || extractCoordsFromMapsUrl(raw);
  const placeQuery = extractPlaceQueryFromMapsUrl(resolved) || extractPlaceQueryFromMapsUrl(raw);
  const mapsUrl = String(resolved || raw).slice(0, 2000);

  let locationAddress = null;
  if (placeQuery && looksLikeStreetLabel(placeQuery)) {
    locationAddress = placeQuery.slice(0, 160);
  }
  if (!locationAddress && coords) {
    locationAddress = await reverseGeocodeStreet(coords.lat, coords.lng);
  }

  return {
    ok: true,
    mapsUrl,
    locationLat: coords?.lat ?? null,
    locationLng: coords?.lng ?? null,
    placeQuery,
    locationAddress,
  };
}

function isUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

module.exports = {
  extractCoordsFromMapsUrl,
  extractPlaceQueryFromMapsUrl,
  looksLikeStreetLabel,
  reverseGeocodeStreet,
  forwardGeocodeQuery,
  parseGoogleMapsLocation,
  isUuid,
};
