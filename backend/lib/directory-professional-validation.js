const { randomUUID } = require('crypto');
const { isUuid } = require('./public-listings/query-helpers');

const PROFESSIONAL_CATEGORIES = new Set([
  'konsulent', 'freelance', 'sherbim', 'kurse', 'dizajn-it', 'marketing', 'mjekesi', 'arsim',
]);

const CURRENCY_VALUES = new Set(['EUR', 'LEK']);

function normalizePortfolioItems(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const title = String(row?.title || '').trim();
    const imageUrl = String(row?.imageUrl || '').trim();
    if (!title || title.length > 120 || !imageUrl) continue;
    let id = String(row?.id || '').trim();
    if (!id) id = randomUUID();
    if (seen.has(id)) id = randomUUID();
    seen.add(id);
    out.push({
      id,
      title,
      description: String(row?.description || '').trim().slice(0, 500),
      imageUrl,
      location: String(row?.location || '').trim().slice(0, 120) || null,
      sortOrder: Number(row?.sortOrder) || i,
    });
  }
  return out.slice(0, 8);
}

function validateProfessionalPayload(body, { partial = false } = {}) {
  if (!partial) {
    if (!String(body?.title || '').trim()) return { ok: false, message: 'Titulli është i detyrueshëm.' };
    if (!String(body?.description || '').trim()) return { ok: false, message: 'Përshkrimi është i detyrueshëm.' };
    if (!PROFESSIONAL_CATEGORIES.has(body?.category)) {
      return { ok: false, message: 'Kategoria nuk është e vlefshme.' };
    }
    const cityId = String(body?.cityId || '').trim();
    if (!cityId || !isUuid(cityId)) return { ok: false, message: 'Zgjidhni një qytet të vlefshëm.' };
    const phone = String(body?.contactPhone || '').trim();
    if (phone.length < 6) return { ok: false, message: 'Numri i telefonit duhet të ketë të paktën 6 karaktere.' };
  }

  let responseTimeHours = null;
  if (body?.responseTimeHours !== null && body?.responseTimeHours !== undefined && String(body.responseTimeHours).trim() !== '') {
    const h = Number(body.responseTimeHours);
    if (!Number.isInteger(h) || h < 1 || h > 168) {
      return { ok: false, message: 'Koha e përgjigjes duhet të jetë 1–168 orë.' };
    }
    responseTimeHours = h;
  }

  let price = null;
  let currency = null;
  if (body?.price !== null && body?.price !== undefined && String(body.price).trim() !== '') {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) return { ok: false, message: 'Çmimi duhet të jetë numër pozitiv.' };
    if (!CURRENCY_VALUES.has(body?.currency)) return { ok: false, message: 'Zgjidhni monedhën.' };
    price = p;
    currency = body.currency;
  }

  const portfolioItems = normalizePortfolioItems(body?.portfolioItems);
  const imageUrls = Array.isArray(body?.imageUrls)
    ? body.imageUrls.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 2)
    : undefined;

  return {
    ok: true,
    responseTimeHours,
    portfolioItems,
    price,
    currency,
    servicesHighlight: String(body?.servicesHighlight || '').trim().slice(0, 240) || null,
    condition: String(body?.condition || '').trim().slice(0, 80) || null,
    imageUrls,
  };
}

function validateProfessionalReviewPayload(body) {
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: 'Vlerësimi duhet të jetë nga 1 deri në 5.' };
  }
  const comment = String(body?.comment || '').trim().slice(0, 2000);
  return { ok: true, rating, comment };
}

module.exports = {
  PROFESSIONAL_CATEGORIES,
  validateProfessionalPayload,
  validateProfessionalReviewPayload,
};
