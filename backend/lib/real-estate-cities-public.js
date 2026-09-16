'use strict';

/**
 * Shared public cities/zones loader — used by GET /real-estate/locations and
 * keyword location resolution (`locationOrForNeedle`). One process cache, 600s TTL.
 */

const { getSupabaseAdmin } = require('./supabase');
const { camelizeRows } = require('./profiles');
const { getCached, setCached } = require('./public-listings-cache');

/** Cities/zones change rarely — within audit 300–600s band. */
const LOCATIONS_CACHE_TTL_MS = 600 * 1000;
const LOCATIONS_CACHE_KEY = 'real-estate-locations:public';

/** Columns required by the public DTO and location name matching. */
const CITY_SELECT = 'id, name, slug, zones';

function formatCity(row) {
  const c = camelizeRows([row])[0];
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    zones: (c.zones || []).map((z) => ({
      id: z.id,
      name: z.name,
      slug: z.slug,
    })),
  };
}

/**
 * Full public cities payload `{ cities: [...] }` — same shape as GET /real-estate/locations.
 */
async function getPublicCitiesPayload() {
  const cached = getCached(LOCATIONS_CACHE_KEY);
  if (cached) return cached;

  const { data, error } = await getSupabaseAdmin()
    .from('real_estate_cities')
    .select(CITY_SELECT)
    .order('name', { ascending: true });
  if (error) throw error;

  const payload = { cities: (data || []).map((d) => formatCity(d)) };
  setCached(LOCATIONS_CACHE_KEY, payload, LOCATIONS_CACHE_TTL_MS);
  return payload;
}

/** City list only (id, name, slug, zones). */
async function getPublicCitiesList() {
  const payload = await getPublicCitiesPayload();
  return payload.cities || [];
}

module.exports = {
  getPublicCitiesPayload,
  getPublicCitiesList,
  LOCATIONS_CACHE_TTL_MS,
  LOCATIONS_CACHE_KEY,
};
