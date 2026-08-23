'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow } = require('../lib/profiles');
const { notifyAdminsListingSubmitted } = require('../lib/listing-moderation');
const { sanitizeImageUrls, requireListingPhotos } = require('../lib/image-upload');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { resolveOptionalCityId } = require('../lib/listing-city');
const { parseComparePrice } = require('../lib/listing-compare-price');
const { formatMineMarketplace, formatMineMarketplaceFull, loadMineKind, loadMineListingById } = require('../lib/mine-listings');
const { assertCanCreateCategoryListing } = require('../lib/listing-category-quota');
const {
  parseMapsFieldsFromBody,
  mapsColumnsFromParsed,
  mapsJsonFromDoc,
} = require('../lib/listing-maps-fields');

const router = express.Router();

const MAX_MARKETPLACE_IMAGES = 5;

const TRANSACTION_VALUES = ['shes'];
const CATEGORY_VALUES = [
  'elektronike', 'mobilje-shtepi', 'veshje-aksesore', 'libra-shkolla',
  'sport-hobi', 'lodra', 'automjete-pjese', 'ushqime-bujqesi', 'sherbime', 'te-tjera',
];
const CONDITION_VALUES = ['i-ri', 'si-i-ri', 'shume-mire', 'mire', 'me-defekte'];
const CURRENCY_VALUES = ['EUR', 'LEK'];

function validate(body) {
  if (body?.transactionType && !TRANSACTION_VALUES.includes(body.transactionType)) {
    return { ok: false, message: 'Lloji i transaksionit nuk është i vlefshëm.' };
  }
  body.transactionType = body?.transactionType || 'shes';
  if (!String(body?.title || '').trim()) return { ok: false, message: 'Titulli është i detyrueshëm.' };
  body.description = String(body?.description || '').trim();
  const category = String(body?.category || '').trim();
  if (category && category.length > 80) return { ok: false, message: 'Kategoria nuk është e vlefshme.' };
  body.category = category || null;

  if (body?.condition && !CONDITION_VALUES.includes(body.condition)) {
    body.condition = null;
  }

  const p = Number(body?.price);
  if (!Number.isFinite(p) || p < 0) return { ok: false, message: 'Çmimi duhet të jetë numër pozitiv.' };
  const currency = String(body?.currency || '').trim() || 'EUR';
  if (!CURRENCY_VALUES.includes(currency)) return { ok: false, message: 'Zgjidhni monedhën për çmimin.' };
  body.currency = currency;

  const cityId = String(body?.cityId || '').trim();
  if (cityId && !isUuid(cityId)) return { ok: false, message: 'Zgjidhni një qytet të vlefshëm.' };
  body.cityId = cityId || null;

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

    const city = await resolveOptionalCityId(body.cityId);
    if (!city.ok) return res.status(400).json({ message: city.message });
    const cityId = city.cityId;

    const maps = await parseMapsFieldsFromBody(body);
    if (!maps.ok) return res.status(400).json({ message: maps.message });

    const imageUrls = sanitizeImageUrls(body.imageUrls, MAX_MARKETPLACE_IMAGES);
    const photos = requireListingPhotos(imageUrls);
    if (!photos.ok) return res.status(400).json({ message: photos.message });

    const price = Number(body.price);
    const cmp = parseComparePrice(body.originalPrice, price);
    if (!cmp.ok) return res.status(400).json({ message: cmp.message });

    const row = {
      poster_id: req.user.id,
      transaction_type: body.transactionType,
      title: String(body.title).trim(),
      description: String(body.description || '').trim(),
      category: body.category || null,
      condition: body.condition || null,
      price,
      original_price: cmp.value,
      currency: body.currency,
      city_id: cityId,
      contact_phone: String(body.contactPhone || '').trim(),
      image_urls: imageUrls,
      status: 'approved',
      ...mapsColumnsFromParsed(maps),
    };

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
      listing: {
        id: String(doc.id),
        title: doc.title,
        status: doc.status,
        createdAt: doc.createdAt,
        ...mapsJsonFromDoc(doc),
      },
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

    const city = await resolveOptionalCityId(body.cityId);
    if (!city.ok) return res.status(400).json({ message: city.message });
    const cityId = city.cityId;

    const maps = await parseMapsFieldsFromBody(body);
    if (!maps.ok) return res.status(400).json({ message: maps.message });

    const imageUrls = sanitizeImageUrls(body.imageUrls, MAX_MARKETPLACE_IMAGES);
    const photos = requireListingPhotos(imageUrls);
    if (!photos.ok) return res.status(400).json({ message: photos.message });

    const price = Number(body.price);
    const cmp = parseComparePrice(body.originalPrice, price);
    if (!cmp.ok) return res.status(400).json({ message: cmp.message });

    const patch = {
      transaction_type: body.transactionType,
      title: String(body.title).trim(),
      description: String(body.description || '').trim(),
      category: body.category || null,
      condition: body.condition || null,
      price,
      original_price: cmp.value,
      currency: body.currency,
      city_id: cityId,
      contact_phone: String(body.contactPhone || '').trim(),
      image_urls: imageUrls,
      updated_at: new Date().toISOString(),
    };
    if (!maps.skip) Object.assign(patch, mapsColumnsFromParsed(maps));

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
      listing: {
        id: String(doc.id),
        title: doc.title,
        status: doc.status,
        updatedAt: doc.updatedAt,
        ...mapsJsonFromDoc(doc),
      },
    });
  } catch (err) {
    console.error('PUT /listings/marketplace/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
