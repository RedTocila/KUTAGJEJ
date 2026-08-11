'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow } = require('../lib/profiles');
const { notifyAdminsListingSubmitted } = require('../lib/listing-moderation');
const { sanitizeImageUrls } = require('../lib/image-upload');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { parseComparePrice } = require('../lib/listing-compare-price');
const { formatMineMarketplace, formatMineMarketplaceFull, loadMineKind, loadMineListingById } = require('../lib/mine-listings');
const { assertCanCreateCategoryListing } = require('../lib/listing-category-quota');

const router = express.Router();

const MAX_MARKETPLACE_IMAGES = 5;

const TRANSACTION_VALUES = ['shes'];
const CATEGORY_VALUES = [
  'elektronike', 'mobilje-shtepi', 'veshje-aksesore', 'libra-shkolla',
  'sport-hobi', 'lodra', 'automjete-pjese', 'ushqime-bujqesi', 'sherbime', 'te-tjera',
];
const CONDITION_VALUES = ['i-ri', 'si-i-ri', 'shume-mire', 'mire', 'me-defekte'];
const CURRENCY_VALUES = ['EUR', 'LEK'];
const SELLING = new Set(['shes']);

function validate(body) {
  if (!TRANSACTION_VALUES.includes(body?.transactionType)) {
    return { ok: false, message: 'Lloji i transaksionit nuk është i vlefshëm.' };
  }
  if (!String(body?.title || '').trim()) return { ok: false, message: 'Titulli është i detyrueshëm.' };
  if (!String(body?.description || '').trim()) return { ok: false, message: 'Përshkrimi është i detyrueshëm.' };
  const category = String(body?.category || '').trim();
  if (!category || category.length > 80) return { ok: false, message: 'Kategoria nuk është e vlefshme.' };
  body.category = category;

  if (SELLING.has(body.transactionType)) {
    if (body?.condition && !CONDITION_VALUES.includes(body.condition)) {
      return { ok: false, message: 'Gjendja e artikullit nuk është e vlefshme.' };
    }
    if (body?.price !== null && body?.price !== undefined && String(body.price).trim() !== '') {
      const p = Number(body.price);
      if (!Number.isFinite(p) || p < 0) return { ok: false, message: 'Çmimi duhet të jetë numër pozitiv.' };
      if (!CURRENCY_VALUES.includes(body?.currency)) return { ok: false, message: 'Zgjidhni monedhën për çmimin.' };
    }
  }

  const cityId = String(body?.cityId || '').trim();
  if (!cityId || !isUuid(cityId)) return { ok: false, message: 'Zgjidhni një qytet të vlefshëm.' };

  const phone = String(body?.contactPhone || '').trim();
  if (phone.length < 6) return { ok: false, message: 'Numri i telefonit duhet të ketë të paktën 6 karaktere.' };
  if (phone.length > 40) return { ok: false, message: 'Numri i telefonit është shumë i gjatë.' };
  if (!/^[\d+\s().-]{6,40}$/.test(phone)) return { ok: false, message: 'Numri i telefonit përmban karaktere të pavlefshme.' };

  return { ok: true };
}

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Vetëm llogaritë individuale ose biznesi mund të postojnë.' });
  }
  next();
}

router.get('/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const listings = await loadMineKind(req.user.id, {
      table: 'marketplace_listings',
      metricKind: 'marketplace',
      format: formatMineMarketplace,
    });
    res.json({ listings });
  } catch (err) {
    console.error('GET /listings/marketplace/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/mine/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ message: 'ID e pavlefshme.' });
    const listing = await loadMineListingById(req.user.id, {
      table: 'marketplace_listings',
      listingId: req.params.id,
      metricKind: 'marketplace',
      format: formatMineMarketplaceFull,
    });
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    res.json({ listing });
  } catch (err) {
    console.error('GET /listings/marketplace/mine/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const quota = await assertCanCreateCategoryListing(req.user.id, 'product');
    if (!quota.ok) return res.status(quota.status || 403).json({ message: quota.message });

    const body = req.body;
    const v = validate(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const cityId = String(body.cityId).trim();
    const { data: city, error: cityErr } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('id')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const selling = SELLING.has(body.transactionType);
    const hasPrice = selling && body.price !== null && body.price !== undefined && String(body.price).trim() !== '';
    const price = hasPrice ? Number(body.price) : null;
    const cmp = parseComparePrice(hasPrice ? body.originalPrice : null, price);
    if (!cmp.ok) return res.status(400).json({ message: cmp.message });

    const row = {
      poster_id: req.user.id,
      transaction_type: body.transactionType,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      condition: selling && body.condition ? body.condition : null,
      price,
      original_price: cmp.value,
      city_id: cityId,
      contact_phone: String(body.contactPhone || '').trim(),
      image_urls: sanitizeImageUrls(body.imageUrls, MAX_MARKETPLACE_IMAGES),
      status: 'approved',
    };
    if (hasPrice) row.currency = body.currency;

    const { data: created, error: insErr } = await getSupabaseAdmin()
      .from('marketplace_listings')
      .insert(row)
      .select('*')
      .single();
    if (insErr) throw insErr;

    const doc = camelizeRow(created);
    await notifyAdminsListingSubmitted('marketplace', doc.id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u publikua me sukses.',
      listing: { id: String(doc.id), title: doc.title, status: doc.status, createdAt: doc.createdAt },
    });
  } catch (err) {
    console.error('POST /listings/marketplace:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PUT /api/listings/marketplace/:id — owner update. */
router.put('/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!isUuid(rawId)) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const { data: existing, error: selErr } = await getSupabaseAdmin()
      .from('marketplace_listings')
      .select('id, poster_id')
      .eq('id', rawId)
      .eq('poster_id', req.user.id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const body = req.body;
    const v = validate(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const cityId = String(body.cityId).trim();
    const { data: city, error: cityErr } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('id')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const selling = SELLING.has(body.transactionType);
    const hasPrice = selling && body.price !== null && body.price !== undefined && String(body.price).trim() !== '';
    const price = hasPrice ? Number(body.price) : null;
    const cmp = parseComparePrice(hasPrice ? body.originalPrice : null, price);
    if (!cmp.ok) return res.status(400).json({ message: cmp.message });

    const patch = {
      transaction_type: body.transactionType,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      condition: selling && body.condition ? body.condition : null,
      price,
      original_price: cmp.value,
      currency: hasPrice ? body.currency : null,
      city_id: cityId,
      contact_phone: String(body.contactPhone || '').trim(),
      image_urls: sanitizeImageUrls(body.imageUrls, MAX_MARKETPLACE_IMAGES),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await getSupabaseAdmin()
      .from('marketplace_listings')
      .update(patch)
      .eq('id', rawId)
      .select('*')
      .single();
    if (updErr) throw updErr;

    const doc = camelizeRow(updated);
    res.json({
      message: 'Njoftimi u përditësua.',
      listing: { id: String(doc.id), title: doc.title, status: doc.status, updatedAt: doc.updatedAt },
    });
  } catch (err) {
    console.error('PUT /listings/marketplace/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
