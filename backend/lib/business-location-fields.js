'use strict';

const { parseGoogleMapsLocation } = require('./google-maps-location');

/**
 * Validate zone against city.zones and optionally parse Google Maps URL.
 * @param {{ zoneId?: string|null, mapsUrlProvided?: boolean, mapsUrlRaw?: string }} v
 * @param {{ id: string, zones?: Array<{ id: string }> } | null} city
 */
async function resolveBusinessLocationFields(v, city) {
  let zoneId = v.zoneId;
  if (zoneId != null) {
    if (!city) {
      return { ok: false, message: 'Zgjidhni qytetin para se të zgjidhni lagjen.' };
    }
    const zones = Array.isArray(city.zones) ? city.zones : [];
    const match = zones.find((z) => String(z.id) === String(zoneId));
    if (!match) {
      return { ok: false, message: 'Lagja / zona nuk i përket qytetit të zgjedhur.' };
    }
  }

  let mapsUrl = undefined;
  let locationLat = undefined;
  let locationLng = undefined;
  let locationAddress = undefined;

  if (v.mapsUrlProvided) {
    const parsed = await parseGoogleMapsLocation(v.mapsUrlRaw || '');
    if (!parsed.ok) return parsed;
    mapsUrl = parsed.mapsUrl;
    locationLat = parsed.locationLat;
    locationLng = parsed.locationLng;
    locationAddress = parsed.locationAddress;
  }

  return {
    ok: true,
    zoneId: zoneId === undefined ? undefined : zoneId,
    mapsUrl,
    locationLat,
    locationLng,
    locationAddress,
  };
}

module.exports = { resolveBusinessLocationFields };
