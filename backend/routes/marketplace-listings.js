'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow, camelizeRows } = require('../lib/profiles');
const { attachOwnerMetrics } = require('../lib/listing-metrics');
const { notifyAdminsListingSubmitted } = require('../lib/listing-moderation');
const { sanitizeImageUrls } = require('../lib/image-upload');
const { isUuid, buildCityIndex } = require('../lib/public-listings/query-helpers');

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
  if (!CATEGORY_VALUES.includes(body?.category)) return { ok: false, message: 'Kategoria nuk është e vlefshme.' };

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
    const { data, error } = await getSupabaseAdmin()
      .from('marketplace_listings')
      .select('*')
      .eq('poster_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const docs = camelizeRows(data);
    const cityById = await buildCityIndex(docs);

    const listings = docs.map((d) => {
      const city = cityById.get(String(d.cityId));
      return {
        id: String(d.id),
        transactionType: d.transactionType,
        title: d.title,
        category: d.category,
        condition: d.condition ?? null,
        price: d.price ?? null,
        currency: d.currency ?? null,
        cityId: d.cityId ? String(d.cityId) : null,
        cityName: city?.name ?? null,
        contactPhone: d.contactPhone ?? null,
        imageUrls: d.imageUrls ?? [],
        status: d.status || 'pending',
        createdAt: d.createdAt,
      };
    });
    res.json({ listings: await attachOwnerMetrics(listings, 'marketplace') });
  } catch (err) {
    console.error('GET /listings/marketplace/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
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

    const row = {
      poster_id: req.user.id,
      transaction_type: body.transactionType,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      condition: selling && body.condition ? body.condition : null,
      price: hasPrice ? Number(body.price) : null,
      city_id: cityId,
      contact_phone: String(body.contactPhone || '').trim(),
      image_urls: sanitizeImageUrls(body.imageUrls, MAX_MARKETPLACE_IMAGES),
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
      message: 'Njoftimi u dërgua për aprovim..',
      listing: { id: String(doc.id), title: doc.title, status: doc.status, createdAt: doc.createdAt },
    });
  } catch (err) {
    console.error('POST /listings/marketplace:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
