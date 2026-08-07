const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRows } = require('../lib/profiles');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function normalizePayload(body) {
  return {
    title: String(body?.title || '').trim(),
    subtitle: String(body?.subtitle || '').trim(),
    // Empty = platform gradient on homepage (do not invent a relative logo path —
    // display only treats https?:// URLs as custom images).
    imageUrl: String(body?.imageUrl || '').trim(),
    ctaLabel: String(body?.ctaLabel || '').trim(),
    ctaHref: String(body?.ctaHref || '').trim(),
    order: Number.isFinite(Number(body?.order)) ? Number(body.order) : 0,
    isActive: body?.isActive !== undefined ? Boolean(body.isActive) : true,
  };
}

function validate(payload) {
  // Title is optional — image-only banners are allowed.
  if (payload.ctaHref && !payload.ctaHref.startsWith('/')) {
    return 'Linku duhet të fillojë me "/" (p.sh. /prona).';
  }
  return null;
}

function toRow(payload) {
  return {
    title: payload.title,
    subtitle: payload.subtitle,
    image_url: payload.imageUrl,
    cta_label: payload.ctaLabel,
    cta_href: payload.ctaHref,
    order: payload.order,
    is_active: payload.isActive,
  };
}

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
    isActive: Boolean(c.isActive),
    updatedAt: c.updatedAt,
  };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('home_banners')
      .select('*')
      .order('order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ banners: (data || []).map((d) => format(d)) });
  } catch (error) {
    console.error('GET /admin/home-banners:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const err = validate(payload);
    if (err) return res.status(400).json({ message: err });
    const { data, error } = await getSupabaseAdmin()
      .from('home_banners')
      .insert(toRow(payload))
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json({ banner: format(data) });
  } catch (error) {
    console.error('POST /admin/home-banners:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const sb = getSupabaseAdmin();
    const { data: doc, error: findError } = await sb.from('home_banners').select('*').eq('id', req.params.id).maybeSingle();
    if (findError) throw findError;
    if (!doc) return res.status(404).json({ message: 'Banner-i nuk u gjet.' });

    const current = camelizeRows([doc])[0];
    const payload = normalizePayload({ ...current, ...req.body });
    const err = validate(payload);
    if (err) return res.status(400).json({ message: err });

    const patch = { ...toRow(payload), updated_at: new Date().toISOString() };
    const { data: updated, error: updateError } = await sb
      .from('home_banners')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    res.json({ banner: format(updated) });
  } catch (error) {
    console.error('PATCH /admin/home-banners/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { data: deleted, error } = await getSupabaseAdmin()
      .from('home_banners')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!deleted) return res.status(404).json({ message: 'Banner-i nuk u gjet.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /admin/home-banners/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
