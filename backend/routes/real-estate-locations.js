const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRows } = require('../lib/profiles');

const router = express.Router();

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

/** Public: cities and zones for the real-estate listing form. */
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json({ cities: (data || []).map((d) => formatCity(d)) });
  } catch (error) {
    console.error('GET /real-estate/locations:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
