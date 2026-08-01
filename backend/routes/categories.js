const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRows } = require('../lib/profiles');

const router = express.Router();

function format(row) {
  const c = camelizeRows([row])[0];
  return {
    key: c.key,
    title: c.title,
    slug: c.slug,
    listingTypes: (c.listingTypes || []).map((t) => ({ slug: t.slug, label: t.label })),
    apartmentTypes: (c.apartmentTypes || []).map((t) => ({ slug: t.slug, label: t.label })),
    updatedAt: c.updatedAt,
  };
}

/** Public: listing forms can resolve category slug → types without admin token. */
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin().from('listing_categories').select('*').order('key', { ascending: true });
    if (error) throw error;
    res.json({ categories: (data || []).map((d) => format(d)) });
  } catch (error) {
    console.error('GET /categories:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
