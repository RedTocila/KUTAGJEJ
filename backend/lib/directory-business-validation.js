const { randomUUID } = require('crypto');
const { normalizeWeeklyHours, formatWeeklyHoursLine, TIME_RE } = require('./business-hours');

const BUSINESS_CATEGORIES = new Set([
  'restorant', 'bar', 'kafe', 'brunch', 'piceri-fast-food', 'pasticeri',
]);

const DEFAULT_TIME_SLOTS = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const DEFAULT_PARTY_SIZES = [1, 2, 3, 4, 5, 6, 8, 10];

function normalizeMenuCategories(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const name = String(row?.name || '').trim();
    if (!name || name.length > 80) continue;
    let id = String(row?.id || '').trim();
    if (!id) id = randomUUID();
    if (seen.has(id)) id = randomUUID();
    seen.add(id);
    out.push({ id, name, sortOrder: Number(row?.sortOrder) || i });
  }
  return out.slice(0, 40);
}

function normalizeMenuItems(input, categories) {
  if (!Array.isArray(input)) return [];
  const catIds = new Set(categories.map((c) => c.id));
  const out = [];
  const seen = new Set();
  for (let i = 0; i < input.length; i += 1) {
    const row = input[i];
    const name = String(row?.name || '').trim();
    if (!name || name.length > 120) continue;
    const categoryId = String(row?.categoryId || '').trim();
    if (!categoryId || !catIds.has(categoryId)) continue;
    const price = Number(row?.price);
    if (!Number.isFinite(price) || price < 0) continue;
    const currency = row?.currency === 'LEK' ? 'LEK' : 'EUR';
    let id = String(row?.id || '').trim();
    if (!id) id = randomUUID();
    if (seen.has(id)) id = randomUUID();
    seen.add(id);
    const description = String(row?.description || '').trim().slice(0, 500);
    const imageUrl = String(row?.imageUrl || '').trim().slice(0, 2000) || null;
    out.push({
      id,
      categoryId,
      name,
      description,
      price,
      currency,
      imageUrl,
      sortOrder: Number(row?.sortOrder) || i,
    });
  }
  return out.slice(0, 250);
}

function normalizeTimeSlots(input) {
  if (!Array.isArray(input) || input.length === 0) return [...DEFAULT_TIME_SLOTS];
  const out = [];
  for (const t of input) {
    const s = String(t || '').trim();
    if (TIME_RE.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= 24) break;
  }
  return out.length > 0 ? out : [...DEFAULT_TIME_SLOTS];
}

function normalizePartySizes(input) {
  if (!Array.isArray(input) || input.length === 0) return [...DEFAULT_PARTY_SIZES];
  const out = [];
  for (const n of input) {
    const v = Number(n);
    if (Number.isInteger(v) && v >= 1 && v <= 50 && !out.includes(v)) out.push(v);
    if (out.length >= 16) break;
  }
  out.sort((a, b) => a - b);
  return out.length > 0 ? out : [...DEFAULT_PARTY_SIZES];
}

function validateBusinessPayload(body, { partial = false } = {}) {
  if (!partial) {
    if (!String(body?.title || '').trim()) return { ok: false, message: 'Titulli është i detyrueshëm.' };
    if (!String(body?.description || '').trim()) return { ok: false, message: 'Përshkrimi është i detyrueshëm.' };
    if (!BUSINESS_CATEGORIES.has(body?.category)) {
      return { ok: false, message: 'Kategoria e biznesit nuk është e vlefshme.' };
    }
    const cityId = String(body?.cityId || '').trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cityId)) {
      return { ok: false, message: 'Zgjidhni një qytet të vlefshëm.' };
    }
    const phone = String(body?.contactPhone || '').trim();
    if (phone.length < 6) return { ok: false, message: 'Numri i telefonit duhet të ketë të paktën 6 karaktere.' };
  }

  const weeklyHours = normalizeWeeklyHours(body?.weeklyHours);
  const menuCategories = normalizeMenuCategories(body?.menuCategories);
  const menuItems = normalizeMenuItems(body?.menuItems, menuCategories);
  const reservationTimeSlots = normalizeTimeSlots(body?.reservationTimeSlots);
  const reservationPartySizes = normalizePartySizes(body?.reservationPartySizes);

  const reservationsEnabled = Boolean(body?.reservationsEnabled);
  const reservationUrl = String(body?.reservationUrl || '').trim() || null;

  const imageUrls = Array.isArray(body?.imageUrls)
    ? body.imageUrls.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 20)
    : undefined;

  return {
    ok: true,
    weeklyHours,
    openingHours: formatWeeklyHoursLine(weeklyHours) || String(body?.openingHours || '').trim() || null,
    menuCategories,
    menuItems,
    reservationTimeSlots,
    reservationPartySizes,
    reservationsEnabled,
    reservationUrl,
    servicesHighlight: String(body?.servicesHighlight || '').trim().slice(0, 240) || null,
    imageUrls,
  };
}

function validateReviewPayload(body) {
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: 'Vlerësimi duhet të jetë nga 1 deri në 5.' };
  }
  const comment = String(body?.comment || '').trim().slice(0, 2000);
  return { ok: true, rating, comment };
}

function validateReservationPayload(body) {
  const guestName = String(body?.guestName || '').trim();
  if (guestName.length < 2) return { ok: false, message: 'Shkruani emrin e plotë.' };
  const guestPhone = String(body?.guestPhone || '').trim();
  if (guestPhone.length < 6) return { ok: false, message: 'Numri i telefonit është i detyrueshëm.' };
  if (!/^[\d+\s().-]{6,40}$/.test(guestPhone)) {
    return { ok: false, message: 'Numri i telefonit nuk është i vlefshëm.' };
  }
  const partySize = Number(body?.partySize);
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) {
    return { ok: false, message: 'Zgjidhni numrin e mysafirëve.' };
  }
  const reservationDate = String(body?.reservationDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationDate)) {
    return { ok: false, message: 'Data e rezervimit nuk është e vlefshme.' };
  }
  const timeSlot = String(body?.timeSlot || '').trim();
  if (!TIME_RE.test(timeSlot)) return { ok: false, message: 'Ora e rezervimit nuk është e vlefshme.' };
  const listingId = String(body?.listingId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId)) {
    return { ok: false, message: 'Njoftimi nuk u gjet.' };
  }
  return { ok: true, guestName, guestPhone, partySize, reservationDate, timeSlot, listingId };
}

module.exports = {
  BUSINESS_CATEGORIES,
  DEFAULT_TIME_SLOTS,
  DEFAULT_PARTY_SIZES,
  validateBusinessPayload,
  validateReviewPayload,
  validateReservationPayload,
};
