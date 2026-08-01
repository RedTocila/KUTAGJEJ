const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRows } = require('../lib/profiles');
const publicCache = require('../middleware/public-cache');

const router = express.Router();
router.use(publicCache(60));

function format(row) {
  const c = camelizeRows([row])[0];
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle || '',
    imageUrl: c.imageUrl,
    ctaLabel: c.ctaLabel || '',
    ctaHref: c.ctaHref || '',
    order: Number(c.order || 0),
  };
}

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('home_banners')
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ banners: (data || []).map((d) => format(d)) });
  } catch (error) {
    console.error('GET /public/home-banners:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
