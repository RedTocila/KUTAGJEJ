'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

/**
 * City is optional on listings. Empty → null. A provided id must exist.
 * @returns {Promise<{ ok: true, cityId: string|null } | { ok: false, message: string }>}
 */
async function resolveOptionalCityId(cityIdRaw, message = 'Qyteti nuk u gjet.') {
  const raw = Array.isArray(cityIdRaw) ? cityIdRaw[0] : cityIdRaw;
  const cityId = String(raw ?? '').trim();
  if (!cityId) return { ok: true, cityId: null };
  if (!isUuid(cityId)) return { ok: false, message };
  const { data, error } = await getSupabaseAdmin()
    .from('real_estate_cities')
    .select('id')
    .eq('id', cityId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, message };
  return { ok: true, cityId };
}

/**
 * Resolve a city and, when supplied, verify that the zone belongs to it.
 * @returns {Promise<{ ok: true, cityId: string|null, zoneId: string|null } | { ok: false, message: string }>}
 */
async function resolveOptionalCityAndZone(cityIdRaw, zoneIdRaw, messages = {}) {
  const cityMessage = messages.city ?? 'Qyteti nuk u gjet.';
  const zoneMessage = messages.zone ?? 'Zona nuk u gjet.';
  const cityValue = Array.isArray(cityIdRaw) ? cityIdRaw[0] : cityIdRaw;
  const cityId = String(cityValue ?? '').trim();
  const zoneValue = Array.isArray(zoneIdRaw) ? zoneIdRaw[0] : zoneIdRaw;
  const zoneId = String(zoneValue ?? '').trim();

  if (!cityId) {
    return zoneId
      ? { ok: false, message: 'Zgjidhni qytetin para se të zgjidhni zonën.' }
      : { ok: true, cityId: null, zoneId: null };
  }
  if (!isUuid(cityId)) return { ok: false, message: cityMessage };
  if (zoneId && !isUuid(zoneId)) return { ok: false, message: zoneMessage };

  const { data, error } = await getSupabaseAdmin()
    .from('real_estate_cities')
    .select('id, zones')
    .eq('id', cityId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, message: cityMessage };
  if (!zoneId) return { ok: true, cityId, zoneId: null };

  const belongsToCity = Array.isArray(data.zones)
    && data.zones.some((zone) => String(zone?.id ?? '') === zoneId);
  if (!belongsToCity) return { ok: false, message: zoneMessage };
  return { ok: true, cityId, zoneId };
}

module.exports = { resolveOptionalCityId, resolveOptionalCityAndZone };
