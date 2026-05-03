const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const MarketplaceListing = require('../models/MarketplaceListing');
const RealEstateCity = require('../models/RealEstateCity');

const router = express.Router();

const TRANSACTION_VALUES = ['shes'];
const CATEGORY_VALUES = [
  'elektronike', 'mobilje-shtepi', 'veshje-aksesore', 'libra-shkolla',
  'sport-hobi', 'lodra', 'automjete-pjese', 'ushqime-bujqesi', 'sherbime', 'te-tjera',
];
const CONDITION_VALUES = ['i-ri', 'si-i-ri', 'shume-mire', 'mire', 'me-defekte'];
const CURRENCY_VALUES = ['EUR', 'LEK'];
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
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
  if (!cityId || !OBJECT_ID_RE.test(cityId)) return { ok: false, message: 'Zgjidhni një qytet të vlefshëm.' };

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
    const posterModel = req.user.constructor.modelName;
    const docs = await MarketplaceListing.find({ posterId: req.user._id, posterModel })
      .sort({ createdAt: -1 }).lean();

    const cityIds = [...new Set(docs.map((d) => String(d.cityId)).filter(Boolean))];
    const cityObjectIds = cityIds.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
    const cities = cityObjectIds.length > 0 ? await RealEstateCity.find({ _id: { $in: cityObjectIds } }).lean() : [];
    const cityById = new Map(cities.map((c) => [String(c._id), c]));

    res.json({
      listings: docs.map((d) => {
        const city = cityById.get(String(d.cityId));
        return {
          id: String(d._id),
          transactionType: d.transactionType,
          title: d.title,
          category: d.category,
          condition: d.condition ?? null,
          price: d.price ?? null,
          currency: d.currency ?? null,
          cityId: d.cityId ? String(d.cityId) : null,
          cityName: city?.name ?? null,
          contactPhone: d.contactPhone ?? null,
          createdAt: d.createdAt,
        };
      }),
    });
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
    const city = await RealEstateCity.findById(cityId).lean();
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const selling = SELLING.has(body.transactionType);
    const hasPrice = selling && body.price !== null && body.price !== undefined && String(body.price).trim() !== '';
    const posterModel = req.user.constructor.modelName;

    const doc = await MarketplaceListing.create({
      posterId: req.user._id,
      posterModel,
      transactionType: body.transactionType,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      condition: selling && body.condition ? body.condition : null,
      price: hasPrice ? Number(body.price) : null,
      currency: hasPrice ? body.currency : null,
      cityId: new mongoose.Types.ObjectId(cityId),
      contactPhone: String(body.contactPhone || '').trim(),
    });

    res.status(201).json({ listing: { id: String(doc._id), title: doc.title, createdAt: doc.createdAt } });
  } catch (err) {
    console.error('POST /listings/marketplace:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
