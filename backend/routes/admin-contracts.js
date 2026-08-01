const express = require('express');
const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const ListingCategory = require('../models/ListingCategory');
const Role = require('../models/Role');
const { CATEGORY_KEYS } = ListingCategory;
const { PLAN_CODES } = Contract;
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function formatQuotas(doc) {
  return {
    maxListAllCategories: Number(doc.maxListAllCategories) || 0,
    maxJobListings: Number(doc.maxJobListings) || 0,
    maxCarListings: Number(doc.maxCarListings) || 0,
    maxApartmentListings: Number(doc.maxApartmentListings) || 0,
    maxProductListings: Number(doc.maxProductListings) || 0,
    maxPremiumListings: Number(doc.maxPremiumListings) || 0,
  };
}

function formatContract(doc, categoryTitleByKey = {}) {
  const roles = (doc.roleIds || [])
    .map((r) => {
      if (r && typeof r === 'object' && r._id) {
        return { id: String(r._id), name: r.name || '' };
      }
      if (r == null) return null;
      return { id: String(r), name: '' };
    })
    .filter(Boolean);
  const catKey = doc.listingCategoryKey || null;
  return {
    id: String(doc._id),
    title: doc.title,
    content: doc.content || '',
    planCode: doc.planCode || null,
    sortOrder: doc.sortOrder ?? 0,
    listingCategoryKey: catKey,
    listingCategoryTitle: catKey ? categoryTitleByKey[catKey] || catKey : null,
    subscriberKind: doc.subscriberKind || null,
    refreshEveryHours: doc.refreshEveryHours ?? null,
    glowBadgeEnabled: Boolean(doc.glowBadgeEnabled),
    boostCredits: doc.boostCredits ?? null,
    dailyBoostAccess: Boolean(doc.dailyBoostAccess),
    ...formatQuotas(doc),
    price1Month: doc.price1Month ?? null,
    price3Months: doc.price3Months ?? null,
    price6Months: doc.price6Months ?? null,
    price12Months: doc.price12Months ?? null,
    roles,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function categoryTitleMapForKeys(keys) {
  const uniq = [...new Set((keys || []).filter(Boolean))];
  if (uniq.length === 0) return {};
  const docs = await ListingCategory.find({ key: { $in: uniq } }).select('key title').lean();
  return Object.fromEntries(docs.map((d) => [d.key, d.title]));
}

function parseOptionalPrice(value, fieldLabelSq) {
  if (value === null || value === undefined) return { ok: true, n: null };
  const s = String(value).trim();
  if (s === '') return { ok: true, n: null };
  const num = Number(s);
  if (!Number.isFinite(num) || num < 0) {
    return { ok: false, message: `${fieldLabelSq} duhet të jetë numër ≥ 0 ose bosh.` };
  }
  return { ok: true, n: num };
}

function countSetPrices(doc) {
  let c = 0;
  if (doc.price1Month != null && Number.isFinite(Number(doc.price1Month))) c += 1;
  if (doc.price3Months != null && Number.isFinite(Number(doc.price3Months))) c += 1;
  if (doc.price6Months != null && Number.isFinite(Number(doc.price6Months))) c += 1;
  if (doc.price12Months != null && Number.isFinite(Number(doc.price12Months))) c += 1;
  return c;
}

function normalizeRoleIds(ids) {
  if (!Array.isArray(ids)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of ids) {
    const s = String(raw ?? '').trim();
    if (!s || !mongoose.Types.ObjectId.isValid(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(new mongoose.Types.ObjectId(s));
  }
  return out;
}

function parseNonNegInt(value, labelSq, { required = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) return { ok: false, message: `${labelSq} është i detyrueshëm.` };
    return { ok: true, n: 0 };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return { ok: false, message: `${labelSq} duhet të jetë numër i plotë ≥ 0.` };
  }
  return { ok: true, n };
}

function parseQuotaBody(body) {
  const fields = [
    ['maxListAllCategories', 'Lista në të gjitha kategoritë'],
    ['maxJobListings', 'Kuota e vendeve të punës'],
    ['maxCarListings', 'Kuota e makinave'],
    ['maxApartmentListings', 'Kuota e apartamenteve'],
    ['maxProductListings', 'Kuota e produkteve'],
    ['maxPremiumListings', 'Kuota e njoftimeve premium'],
  ];
  const out = {};
  for (const [key, label] of fields) {
    if (body[key] === undefined) continue;
    const r = parseNonNegInt(body[key], label);
    if (!r.ok) return { ok: false, message: r.message };
    out[key] = r.n;
  }
  return { ok: true, quotas: out };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const docs = await Contract.find().sort({ sortOrder: 1, updatedAt: -1 }).populate('roleIds', 'name').lean();
    const titleByKey = await categoryTitleMapForKeys(docs.map((d) => d.listingCategoryKey));
    res.json({ contracts: docs.map((d) => formatContract(d, titleByKey)) });
  } catch (error) {
    console.error('GET /admin/contracts:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      roleIds,
      listingCategoryKey,
      subscriberKind,
      refreshEveryHours,
      glowBadgeEnabled,
      boostCredits,
      dailyBoostAccess,
      price1Month,
      price3Months,
      price6Months,
      price12Months,
      planCode,
      sortOrder,
    } = req.body;

    const p1 = parseOptionalPrice(price1Month, 'Çmimi 1 muaj');
    const p3 = parseOptionalPrice(price3Months, 'Çmimi 3 muaj');
    const p6 = parseOptionalPrice(price6Months, 'Çmimi 6 muaj');
    const p12 = parseOptionalPrice(price12Months, 'Çmimi 12 muaj');
    if (!p1.ok) return res.status(400).json({ message: p1.message });
    if (!p3.ok) return res.status(400).json({ message: p3.message });
    if (!p6.ok) return res.status(400).json({ message: p6.message });
    if (!p12.ok) return res.status(400).json({ message: p12.message });

    if (p1.n == null && p3.n == null && p6.n == null && p12.n == null) {
      return res.status(400).json({
        message: 'Vendosni të paktën një çmim (1, 3, 6 ose 12 muaj). Lini bosh fushat që nuk përdoren.',
      });
    }

    let catKey = null;
    if (listingCategoryKey != null && String(listingCategoryKey).trim() !== '') {
      catKey = String(listingCategoryKey).trim();
      if (!CATEGORY_KEYS.includes(catKey)) {
        return res.status(400).json({ message: 'Zgjidhni një kategori kontrate.' });
      }
      const cat = await ListingCategory.findOne({ key: catKey }).select('key').lean();
      if (!cat) {
        return res.status(400).json({ message: 'Kategoria nuk ekziston.' });
      }
    }

    const kind = String(subscriberKind || '').trim();
    if (kind !== 'agent' && kind !== 'company') {
      return res.status(400).json({ message: 'Lloji i abonentit duhet të jetë agjent ose kompani.' });
    }

    const refreshH = Number(refreshEveryHours);
    if (!Number.isFinite(refreshH) || refreshH < 1) {
      return res.status(400).json({ message: 'Rifreskimi çdo sa orë duhet të jetë të paktën 1.' });
    }

    const boost = Number(boostCredits);
    if (!Number.isFinite(boost) || boost < 0) {
      return res.status(400).json({ message: 'Kreditet boost duhet të jenë numër jo negativ.' });
    }

    const quotaParse = parseQuotaBody(req.body);
    if (!quotaParse.ok) return res.status(400).json({ message: quotaParse.message });

    const t = String(title || '').trim();
    if (!t) {
      return res.status(400).json({ message: 'Titulli është i detyrueshëm.' });
    }

    const roleObjectIds = normalizeRoleIds(roleIds);
    if (roleObjectIds.length === 0) {
      return res.status(400).json({ message: 'Zgjidhni të paktën një rol nga katalogu.' });
    }

    const found = await Role.find({ _id: { $in: roleObjectIds } }).select('_id').lean();
    if (found.length !== roleObjectIds.length) {
      return res.status(400).json({ message: 'Një ose më shumë role nuk ekzistojnë.' });
    }

    let code = null;
    if (planCode != null && String(planCode).trim() !== '') {
      code = String(planCode).trim().toLowerCase();
      if (!PLAN_CODES.includes(code)) {
        return res.status(400).json({ message: 'Kodi i planit është i pavlefshëm.' });
      }
    }

    const sort = sortOrder === undefined || sortOrder === '' ? 0 : Number(sortOrder);
    if (!Number.isFinite(sort)) {
      return res.status(400).json({ message: 'Renditja duhet të jetë numër.' });
    }

    const contract = new Contract({
      title: t,
      content: content !== undefined ? String(content) : '',
      planCode: code,
      sortOrder: sort,
      listingCategoryKey: catKey,
      subscriberKind: kind,
      refreshEveryHours: refreshH,
      glowBadgeEnabled: Boolean(glowBadgeEnabled),
      boostCredits: boost,
      dailyBoostAccess: Boolean(dailyBoostAccess),
      ...quotaParse.quotas,
      price1Month: p1.n,
      price3Months: p3.n,
      price6Months: p6.n,
      price12Months: p12.n,
      roleIds: roleObjectIds,
      createdBy: req.admin._id,
    });
    await contract.save();
    const populated = await Contract.findById(contract._id).populate('roleIds', 'name').lean();
    const titleByKey = await categoryTitleMapForKeys([populated.listingCategoryKey]);
    res.status(201).json({ contract: formatContract(populated, titleByKey) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Ky plan (kod + lloj abonenti) ekziston tashmë.' });
    }
    console.error('POST /admin/contracts:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Kontrata nuk u gjet.' });

    const {
      title,
      content,
      roleIds,
      listingCategoryKey,
      subscriberKind,
      refreshEveryHours,
      glowBadgeEnabled,
      boostCredits,
      dailyBoostAccess,
      price1Month,
      price3Months,
      price6Months,
      price12Months,
      planCode,
      sortOrder,
    } = req.body;

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ message: 'Titulli nuk mund të jetë bosh.' });
      contract.title = t;
    }
    if (content !== undefined) contract.content = String(content);

    if (planCode !== undefined) {
      if (planCode === null || String(planCode).trim() === '') {
        contract.planCode = null;
      } else {
        const code = String(planCode).trim().toLowerCase();
        if (!PLAN_CODES.includes(code)) {
          return res.status(400).json({ message: 'Kodi i planit është i pavlefshëm.' });
        }
        contract.planCode = code;
      }
    }

    if (sortOrder !== undefined) {
      const sort = Number(sortOrder);
      if (!Number.isFinite(sort)) {
        return res.status(400).json({ message: 'Renditja duhet të jetë numër.' });
      }
      contract.sortOrder = sort;
    }

    if (listingCategoryKey !== undefined) {
      if (listingCategoryKey === null || String(listingCategoryKey).trim() === '') {
        contract.listingCategoryKey = null;
      } else {
        const catKey = String(listingCategoryKey).trim();
        if (!CATEGORY_KEYS.includes(catKey)) {
          return res.status(400).json({ message: 'Kategori e pavlefshme.' });
        }
        const cat = await ListingCategory.findOne({ key: catKey }).select('key').lean();
        if (!cat) return res.status(400).json({ message: 'Kategoria nuk ekziston.' });
        contract.listingCategoryKey = catKey;
      }
    }

    if (subscriberKind !== undefined) {
      const kind = String(subscriberKind || '').trim();
      if (kind !== 'agent' && kind !== 'company') {
        return res.status(400).json({ message: 'Lloji i abonentit duhet të jetë agjent ose kompani.' });
      }
      contract.subscriberKind = kind;
    }

    if (refreshEveryHours !== undefined) {
      const refreshH = Number(refreshEveryHours);
      if (!Number.isFinite(refreshH) || refreshH < 1) {
        return res.status(400).json({ message: 'Rifreskimi çdo sa orë duhet të jetë të paktën 1.' });
      }
      contract.refreshEveryHours = refreshH;
    }

    if (glowBadgeEnabled !== undefined) contract.glowBadgeEnabled = Boolean(glowBadgeEnabled);
    if (dailyBoostAccess !== undefined) contract.dailyBoostAccess = Boolean(dailyBoostAccess);

    if (boostCredits !== undefined) {
      const boost = Number(boostCredits);
      if (!Number.isFinite(boost) || boost < 0) {
        return res.status(400).json({ message: 'Kreditet boost duhet të jenë numër jo negativ.' });
      }
      contract.boostCredits = boost;
    }

    const quotaParse = parseQuotaBody(req.body);
    if (!quotaParse.ok) return res.status(400).json({ message: quotaParse.message });
    Object.assign(contract, quotaParse.quotas);

    if (price1Month !== undefined) {
      if (price1Month === null || price1Month === '') {
        contract.price1Month = null;
      } else {
        const r = parseOptionalPrice(price1Month, 'Çmimi 1 muaj');
        if (!r.ok) return res.status(400).json({ message: r.message });
        contract.price1Month = r.n;
      }
    }
    if (price3Months !== undefined) {
      if (price3Months === null || price3Months === '') {
        contract.price3Months = null;
      } else {
        const r = parseOptionalPrice(price3Months, 'Çmimi 3 muaj');
        if (!r.ok) return res.status(400).json({ message: r.message });
        contract.price3Months = r.n;
      }
    }
    if (price6Months !== undefined) {
      if (price6Months === null || price6Months === '') {
        contract.price6Months = null;
      } else {
        const r = parseOptionalPrice(price6Months, 'Çmimi 6 muaj');
        if (!r.ok) return res.status(400).json({ message: r.message });
        contract.price6Months = r.n;
      }
    }
    if (price12Months !== undefined) {
      if (price12Months === null || price12Months === '') {
        contract.price12Months = null;
      } else {
        const r = parseOptionalPrice(price12Months, 'Çmimi 12 muaj');
        if (!r.ok) return res.status(400).json({ message: r.message });
        contract.price12Months = r.n;
      }
    }

    const pricePatchTouched =
      price1Month !== undefined ||
      price3Months !== undefined ||
      price6Months !== undefined ||
      price12Months !== undefined;
    if (pricePatchTouched && countSetPrices(contract) === 0) {
      return res.status(400).json({
        message: 'Duhet të mbetet të paktën një çmim. Mos i boshatisni të gjitha afatet njëkohësisht.',
      });
    }

    if (roleIds !== undefined) {
      const roleObjectIds = normalizeRoleIds(roleIds);
      if (roleObjectIds.length === 0) {
        return res.status(400).json({ message: 'Zgjidhni të paktën një rol.' });
      }
      const found = await Role.find({ _id: { $in: roleObjectIds } }).select('_id').lean();
      if (found.length !== roleObjectIds.length) {
        return res.status(400).json({ message: 'Një ose më shumë role nuk ekzistojnë.' });
      }
      contract.roleIds = roleObjectIds;
    }

    await contract.save();
    const populated = await Contract.findById(contract._id).populate('roleIds', 'name').lean();
    const titleByKey = await categoryTitleMapForKeys([populated.listingCategoryKey]);
    res.json({ contract: formatContract(populated, titleByKey) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Ky plan (kod + lloj abonenti) ekziston tashmë.' });
    }
    console.error('PATCH /admin/contracts/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Kontrata nuk u gjet.' });
    res.json({ message: 'Kontrata u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/contracts/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
