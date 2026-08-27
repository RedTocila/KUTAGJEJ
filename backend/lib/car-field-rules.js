/** Server-side validation rules for car listings (mirrors frontend car-constants.ts). */

const {
  VEHICLE_TYPE_VALUES,
  allVehicleMakes,
  makesForVehicleType,
} = require('./vehicle-catalog');

const CAR_MAKES = allVehicleMakes();

const TRANSMISSION_VALUES = ['automatic', 'manual'];

const FUEL_TYPE_VALUES = [
  'petrol', 'diesel', 'electric', 'ethanol', 'hybrid-diesel', 'hybrid-petrol',
  'hydrogen', 'lpg', 'natural-gas', 'plugin-hybrid', 'other',
];

const COLOUR_VALUES = [
  'beige', 'blue', 'brown', 'yellow', 'gold', 'green', 'grey', 'orange',
  'red', 'black', 'silver', 'purple', 'white',
];

const FINISH_VALUES = ['matte', 'metallic'];

const CURRENCY_VALUES = ['EUR', 'LEK'];

const CURRENT_YEAR = new Date().getFullYear();

const { isUuid } = require('./public-listings/query-helpers');

function normalizeFuelType(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (FUEL_TYPE_VALUES.includes(s)) return s;
  if (/naft|diesel|gazoil|dizel/i.test(s)) return 'diesel';
  if (/benzin|petrol|gasoline/i.test(s)) return 'petrol';
  if (/lpg|autogas|\bgaz\b/i.test(s)) return 'lpg';
  if (/hybrid.*diesel|hibrid.*naft/i.test(s)) return 'hybrid-diesel';
  if (/plugin|plug-in/i.test(s)) return 'plugin-hybrid';
  if (/hybrid|hibrid/i.test(s)) return 'hybrid-petrol';
  if (/elektrik|electric|\bev\b/i.test(s)) return 'electric';
  if (/metan|natural.?gas|cng/i.test(s)) return 'natural-gas';
  if (/hidrogjen|hydrogen/i.test(s)) return 'hydrogen';
  if (/etanol|ethanol/i.test(s)) return 'ethanol';
  if (/tjet|other/i.test(s)) return 'other';
  return null;
}

/**
 * Validates a car listing payload (fields already extracted from multipart or JSON).
 * Returns { ok: true } or { ok: false, message }.
 */
function validateCarPayload(fields) {
  const vehicleType = String(fields.vehicleType || '').trim().toLowerCase() || 'car';
  if (!VEHICLE_TYPE_VALUES.includes(vehicleType)) {
    return { ok: false, message: 'Please select a valid vehicle category.' };
  }
  fields.vehicleType = vehicleType;

  const make = String(fields.make || '').trim();
  if (make.length > 80) return { ok: false, message: 'Make is too long.' };
  const catalogMakes = makesForVehicleType(vehicleType);
  const matchedMake = catalogMakes.find((m) => m.toLowerCase() === make.toLowerCase());
  fields.make = matchedMake || make;

  const model = String(fields.model || '').trim();
  if (model.length > 80) return { ok: false, message: 'Model is too long.' };
  fields.model = model;

  fields.description = String(fields.description || '').trim();

  if (fields.year !== undefined && fields.year !== null && String(fields.year).trim() !== '') {
    const year = Number(fields.year);
    if (!Number.isInteger(year) || year < 1970 || year > CURRENT_YEAR + 1) {
      return { ok: false, message: `Year must be between 1970 and ${CURRENT_YEAR + 1}.` };
    }
    fields.year = year;
  } else {
    fields.year = null;
  }

  if (fields.kilometers !== undefined && fields.kilometers !== null && String(fields.kilometers).trim() !== '') {
    const km = Number(fields.kilometers);
    if (!Number.isFinite(km) || !Number.isInteger(km) || km < 0) {
      return { ok: false, message: 'Kilometres must be a non-negative whole number.' };
    }
    fields.kilometers = km;
  } else {
    fields.kilometers = null;
  }

  const transmission = String(fields.transmission || '').trim().toLowerCase();
  if (transmission && !TRANSMISSION_VALUES.includes(transmission)) {
    return { ok: false, message: 'Transmission must be automatic or manual.' };
  }
  fields.transmission = transmission || null;

  fields.fuelType = normalizeFuelType(fields.fuelType);

  const price = Number(fields.price);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, message: 'Price must be a valid non-negative number.' };
  }

  const currency = String(fields.currency || '').trim() || 'EUR';
  if (!CURRENCY_VALUES.includes(currency)) {
    return { ok: false, message: 'Currency must be EUR or LEK.' };
  }
  fields.currency = currency;

  const color = String(fields.color || '').trim().toLowerCase();
  if (!color) {
    fields.color = null;
  } else if (!COLOUR_VALUES.includes(color)) {
    fields.color = 'grey';
  } else {
    fields.color = color;
  }

  const contactPhone = String(fields.contactPhone || '').trim();
  if (contactPhone.length < 6) {
    return { ok: false, message: 'Phone number is required (at least 6 characters).' };
  }
  if (contactPhone.length > 40) {
    return { ok: false, message: 'Phone number is too long.' };
  }
  if (!/^[\d+\s().-]{6,40}$/.test(contactPhone)) {
    return { ok: false, message: 'Phone number contains invalid characters.' };
  }

  const rawCityId = Array.isArray(fields.cityId) ? fields.cityId[0] : fields.cityId;
  const cityId = String(rawCityId || '').trim();
  if (cityId && !isUuid(cityId)) {
    return { ok: false, message: 'Please select a valid city.' };
  }
  fields.cityId = cityId || null;

  return { ok: true };
}

module.exports = {
  CAR_MAKES,
  VEHICLE_TYPE_VALUES,
  TRANSMISSION_VALUES,
  FUEL_TYPE_VALUES,
  COLOUR_VALUES,
  FINISH_VALUES,
  normalizeFuelType,
  validateCarPayload,
};
