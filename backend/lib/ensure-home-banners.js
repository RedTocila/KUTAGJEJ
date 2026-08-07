const { getSupabaseAdmin } = require('./supabase');

/** Titles of the old auto-seeded placeholder slides (no image). */
const LEGACY_EMPTY_SEED_TITLES = new Set([
  'Posto njoftimin tënd falas në sekonda',
  'Gjej atë që kërkon, më shpejt',
  'Prona në Tiranë, Durrës e gjithë Shqipërinë',
  'Makina të reja dhe të përdorura',
  'Oferta pune pranë teje',
  'Tregu online – bli e shit lehtë',
  'Zbulo biznese lokale pranë teje',
]);

function isEmptyImage(url) {
  return !String(url || '').trim();
}

async function ensureHomeBanners() {
  const sb = getSupabaseAdmin();

  // Remove legacy empty seeded banners. Do not re-seed or enforce a fixed count —
  // admins may keep any number of banners (including zero).
  const { data: rows, error: findErr } = await sb
    .from('home_banners')
    .select('id, title, image_url, subtitle');
  if (findErr) throw findErr;

  const legacyIds = (rows || [])
    .filter((r) => isEmptyImage(r.image_url) && LEGACY_EMPTY_SEED_TITLES.has(String(r.title || '')))
    .map((r) => r.id);

  if (legacyIds.length > 0) {
    const { error: delErr } = await sb.from('home_banners').delete().in('id', legacyIds);
    if (delErr) throw delErr;
  }

  // Drop legacy subtitles so slides show headline only.
  const { error: clearErr } = await sb
    .from('home_banners')
    .update({ subtitle: '', updated_at: new Date().toISOString() })
    .not('subtitle', 'eq', '');
  if (clearErr) throw clearErr;
}

module.exports = { ensureHomeBanners };
