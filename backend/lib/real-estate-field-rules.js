/**
 * Canonical property category slugs (English) — must match frontend.
 */
const PROPERTY_SLUGS = [
  'apartment',
  'villa',
  'penthouse-duplex',
  'part-of-villa',
  'room-studio-attic',
  'parking',
  'shop',
  'office',
  'industrial-shed',
  'commercial-local',
  'warehouse',
  'business-space',
  'building-plot',
  'agricultural-land',
];

const CONDITION_SLUGS = ['new', 'in-construction', 'renovated', 'good-condition'];
const FURNISHING_SLUGS = ['furnished', 'unfurnished', 'partially-furnished', 'kitchen-only'];

function needsCondition(cat) {
  const no = new Set(['parking', 'warehouse', 'building-plot', 'agricultural-land', 'villa']);
  return !no.has(cat);
}

function needsFloor(cat) {
  return cat === 'apartment';
}

function needsTotalFloors(cat) {
  return cat === 'villa';
}

function needsParkingFloor(cat) {
  return cat === 'parking';
}

function needsBedroomsBathFurnishing(cat) {
  return new Set(['apartment', 'villa', 'penthouse-duplex', 'part-of-villa', 'room-studio-attic']).has(cat);
}

function needsYearBuilt(cat) {
  return cat === 'apartment';
}

/**
 * Returns { ok: true } or { ok: false, message }.
 */
function validateRealEstatePayload(body) {
  const cat = String(body?.propertyCategory || '')
    .trim()
    .toLowerCase();
  if (cat && !PROPERTY_SLUGS.includes(cat)) {
    return { ok: false, message: 'Invalid property category.' };
  }
  body.propertyCategory = cat || null;

  const title = String(body?.title || '').trim();
  if (!title) return { ok: false, message: 'Title is required.' };

  const transactionType = String(body?.transactionType || '').trim();
  if (transactionType && transactionType !== 'rent' && transactionType !== 'sale') {
    return { ok: false, message: 'Transaction type must be rent or sale.' };
  }
  body.transactionType = transactionType || null;

  const price = Number(body?.price);
  if (!Number.isFinite(price) || price < 0) return { ok: false, message: 'Price must be a valid number.' };

  const currency = String(body?.currency || '').trim() || 'EUR';
  if (currency !== 'EUR' && currency !== 'LEK') {
    return { ok: false, message: 'Currency must be EUR or LEK.' };
  }
  body.currency = currency;

  const surfaceRaw = body?.surfaceM2;
  if (surfaceRaw !== undefined && surfaceRaw !== null && String(surfaceRaw).trim() !== '') {
    const surfaceM2 = Number(String(surfaceRaw).replace(',', '.').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(surfaceM2) || surfaceM2 <= 0) {
      return { ok: false, message: 'Surface (m²) must be a positive number.' };
    }
    body.surfaceM2 = surfaceM2;
  } else {
    body.surfaceM2 = null;
  }

  const cityId = String(body?.cityId ?? '').trim();
  body.cityId = cityId || null;

  const contactPhone = String(body?.contactPhone ?? '').trim();
  if (contactPhone.length < 6) {
    return { ok: false, message: 'Phone number is required (at least 6 characters).' };
  }
  if (contactPhone.length > 40) {
    return { ok: false, message: 'Phone number is too long.' };
  }
  if (!/^[\d+\s().-]{6,40}$/.test(contactPhone)) {
    return { ok: false, message: 'Phone number contains invalid characters.' };
  }

  const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';

  if (filled(body?.condition)) {
    if (!needsCondition(cat) || !CONDITION_SLUGS.includes(body.condition)) {
      body.condition = null;
    }
  } else {
    body.condition = null;
  }

  if (needsFloor(cat) && filled(body?.floor)) {
    const f = Number(body.floor);
    if (!Number.isInteger(f)) return { ok: false, message: 'Floor must be a whole number.' };
  }

  if (needsTotalFloors(cat) && filled(body?.totalFloors)) {
    const tf = Number(body.totalFloors);
    if (!Number.isInteger(tf) || tf < 1) {
      return { ok: false, message: 'Total floors must be a positive integer.' };
    }
  }

  if (needsParkingFloor(cat) && filled(body?.parkingFloor)) {
    const pf = Number(body.parkingFloor);
    if (!Number.isInteger(pf)) return { ok: false, message: 'Parking floor level must be a whole number (can be negative).' };
  }

  if (needsBedroomsBathFurnishing(cat)) {
    if (filled(body?.bedrooms)) {
      const br = Number(body.bedrooms);
      if (!Number.isInteger(br) || br < 0) return { ok: false, message: 'Bedrooms must be a non-negative integer.' };
    }
    if (filled(body?.bathrooms)) {
      const ba = Number(body.bathrooms);
      if (!Number.isInteger(ba) || ba < 0) return { ok: false, message: 'Bathrooms must be a non-negative integer.' };
    }
    if (filled(body?.furnishing) && !FURNISHING_SLUGS.includes(body.furnishing)) {
      body.furnishing = null;
    }
  }

  if (needsYearBuilt(cat) && filled(body?.yearBuilt)) {
    const y = Number(body.yearBuilt);
    if (!Number.isInteger(y) || y < 1800 || y > 2100) {
      return { ok: false, message: 'Year built must be a valid year.' };
    }
  }

  return { ok: true };
}

module.exports = {
  PROPERTY_SLUGS,
  CONDITION_SLUGS,
  FURNISHING_SLUGS,
  needsCondition,
  needsFloor,
  needsTotalFloors,
  needsParkingFloor,
  needsBedroomsBathFurnishing,
  needsYearBuilt,
  validateRealEstatePayload,
};
