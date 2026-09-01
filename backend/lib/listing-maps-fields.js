'use strict';

const { parseGoogleMapsLocation } = require('./google-maps-location');

function parseOptionalCoord(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeAddress(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed.slice(0, 160) : null;
}

/**
 * Parse optional mapsUrl / street address / coordinates from a listing create/update body.
 * @returns {Promise<{ ok: true, mapsUrl: string|null, locationLat: number|null, locationLng: number|null, locationAddress: string|null } | { ok: true, skip: true } | { ok: false, message: string }>}
 */
async function parseMapsFieldsFromBody(body, { requiredWhenProvided = true } = {}) {
  const mapsUrlProvided = body?.mapsUrl !== undefined;
  const locationAddressProvided = body?.locationAddress !== undefined;
  const locationLatProvided = body?.locationLat !== undefined;
  const locationLngProvided = body?.locationLng !== undefined;

  if (!mapsUrlProvided && !locationAddressProvided && !locationLatProvided && !locationLngProvided) {
    return { ok: true, skip: true };
  }

  let mapsUrl = mapsUrlProvided ? String(body.mapsUrl || '').trim() || null : null;
  let locationLat = locationLatProvided ? parseOptionalCoord(body.locationLat) : null;
  let locationLng = locationLngProvided ? parseOptionalCoord(body.locationLng) : null;
  let locationAddress = locationAddressProvided ? normalizeAddress(body.locationAddress) : null;

  if (mapsUrlProvided) {
    const parsed = await parseGoogleMapsLocation(body.mapsUrl);
    if (!parsed.ok) return parsed;
    if (requiredWhenProvided && String(body.mapsUrl || '').trim() && !parsed.mapsUrl) {
      return { ok: false, message: 'Linku i Google Maps nuk është i vlefshëm.' };
    }
    mapsUrl = parsed.mapsUrl;
    if (parsed.locationLat != null) locationLat = parsed.locationLat;
    if (parsed.locationLng != null) locationLng = parsed.locationLng;
    if (parsed.locationAddress && !locationAddress) locationAddress = parsed.locationAddress;
  }

  if (!mapsUrl && locationAddress) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`;
  }

  const hasMapData = Boolean(mapsUrl || locationAddress || (locationLat != null && locationLng != null));
  if (!hasMapData) {
    return {
      ok: true,
      mapsUrl: null,
      locationLat: null,
      locationLng: null,
      locationAddress: null,
    };
  }

  return {
    ok: true,
    mapsUrl,
    locationLat,
    locationLng,
    locationAddress,
  };
}

/** Snake_case columns for insert/update. */
function mapsColumnsFromParsed(parsed) {
  if (!parsed || parsed.skip) return {};
  return {
    maps_url: parsed.mapsUrl ?? null,
    location_lat: parsed.locationLat ?? null,
    location_lng: parsed.locationLng ?? null,
    location_address: parsed.locationAddress ?? null,
  };
}

function mapsJsonFromDoc(doc) {
  const lat =
    typeof doc.locationLat === 'number'
      ? doc.locationLat
      : doc.locationLat != null
        ? Number(doc.locationLat)
        : null;
  const lng =
    typeof doc.locationLng === 'number'
      ? doc.locationLng
      : doc.locationLng != null
        ? Number(doc.locationLng)
        : null;
  return {
    mapsUrl: doc.mapsUrl?.trim?.() || doc.mapsUrl || null,
    locationAddress: doc.locationAddress?.trim?.() || doc.locationAddress || null,
    locationLat: Number.isFinite(lat) ? lat : null,
    locationLng: Number.isFinite(lng) ? lng : null,
  };
}

module.exports = {
  parseMapsFieldsFromBody,
  mapsColumnsFromParsed,
  mapsJsonFromDoc,
};
