const express = require('express');
const crypto = require('crypto');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRows } = require('../lib/profiles');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Only platform administrators can use this.' });
  }
  next();
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

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
    updatedAt: c.updatedAt,
  };
}

function parseZonesInput(rawZones) {
  if (!Array.isArray(rawZones)) return { ok: false, message: 'zones must be an array.' };
  const seen = new Set();
  const zones = [];
  for (const row of rawZones) {
    const name = String(row?.name ?? '').trim();
    let slug = normalizeSlug(row?.slug ?? '');
    if (!name) return { ok: false, message: 'Each zone must have a name.' };
    if (!slug) slug = normalizeSlug(name);
    if (!slug || !SLUG_RE.test(slug)) return { ok: false, message: `Invalid zone slug for «${name}».` };
    if (seen.has(slug)) return { ok: false, message: `Duplicate zone slug: ${slug}` };
    seen.add(slug);
    zones.push({ id: row?.id && UUID_RE.test(String(row.id)) ? row.id : crypto.randomUUID(), name, slug });
  }
  return { ok: true, zones };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json({ cities: (data || []).map((d) => formatCity(d)) });
  } catch (error) {
    console.error('GET /admin/real-estate/locations:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    let slug = normalizeSlug(req.body?.slug ?? '');
    if (!name) return res.status(400).json({ message: 'City name is required.' });
    if (!slug) slug = normalizeSlug(name);
    if (!slug || !SLUG_RE.test(slug)) return res.status(400).json({ message: 'Invalid city slug.' });
    const parsed = parseZonesInput(req.body?.zones ?? []);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });

    const { data, error } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .insert({ name, slug, zones: parsed.zones })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'A city with this slug already exists.' });
      }
      throw error;
    }
    res.status(201).json({ city: formatCity(data) });
  } catch (error) {
    console.error('POST /admin/real-estate/locations:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return res.status(400).json({ message: 'Invalid city id.' });
    const sb = getSupabaseAdmin();
    const { data: doc, error: findError } = await sb.from('real_estate_cities').select('*').eq('id', id).maybeSingle();
    if (findError) throw findError;
    if (!doc) return res.status(404).json({ message: 'City not found.' });

    const patch = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: 'City name cannot be empty.' });
      patch.name = name;
    }
    if (req.body.slug !== undefined) {
      const slug = normalizeSlug(req.body.slug);
      if (!slug || !SLUG_RE.test(slug)) return res.status(400).json({ message: 'Invalid city slug.' });
      const { data: conflict, error: conflictError } = await sb
        .from('real_estate_cities')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .maybeSingle();
      if (conflictError) throw conflictError;
      if (conflict) return res.status(400).json({ message: 'Slug is already used by another city.' });
      patch.slug = slug;
    }
    if (req.body.zones !== undefined) {
      const parsed = parseZonesInput(req.body.zones);
      if (!parsed.ok) return res.status(400).json({ message: parsed.message });
      patch.zones = parsed.zones;
    }
    patch.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await sb
      .from('real_estate_cities')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) {
      if (updateError.code === '23505') {
        return res.status(400).json({ message: 'Slug conflict.' });
      }
      throw updateError;
    }
    res.json({ city: formatCity(updated) });
  } catch (error) {
    console.error('PATCH /admin/real-estate/locations/:id:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) return res.status(400).json({ message: 'Invalid city id.' });
    const sb = getSupabaseAdmin();
    const { data: deleted, error } = await sb.from('real_estate_cities').delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!deleted) return res.status(404).json({ message: 'City not found.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /admin/real-estate/locations/:id:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
