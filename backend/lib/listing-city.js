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

module.exports = { resolveOptionalCityId };
