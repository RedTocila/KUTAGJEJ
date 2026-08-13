'use strict';

const { parseGoogleMapsLocation } = require('./google-maps-location');

/**
 * Parse optional mapsUrl from a listing create/update body.
 * @returns {Promise<{ ok: true, mapsUrl: string|null, locationLat: number|null, locationLng: number|null, locationAddress: string|null } | { ok: true, skip: true } | { ok: false, message: string }>}
 */
async function parseMapsFieldsFromBody(body, { requiredWhenProvided = true } = {}) {
  if (body?.mapsUrl === undefined) {
    return { ok: true, skip: true };
  }
  const parsed = await parseGoogleMapsLocation(body.mapsUrl);
  if (!parsed.ok) return parsed;
  if (requiredWhenProvided && String(body.mapsUrl || '').trim() && !parsed.mapsUrl) {
    return { ok: false, message: 'Linku i Google Maps nuk është i vlefshëm.' };
  }
  return {
    ok: true,
    mapsUrl: parsed.mapsUrl,
    locationLat: parsed.locationLat,
    locationLng: parsed.locationLng,
    locationAddress: parsed.locationAddress,
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
