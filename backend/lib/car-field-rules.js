/** Server-side validation rules for car listings (mirrors frontend car-constants.ts). */

const {
  VEHICLE_TYPE_VALUES,
  isValidVehicleMake,
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

/**
 * Validates a car listing payload (fields already extracted from multipart or JSON).
 * Returns { ok: true } or { ok: false, message }.
 */
function validateCarPayload(fields) {
  const vehicleType = String(fields.vehicleType || 'car').trim().toLowerCase();
  if (!VEHICLE_TYPE_VALUES.includes(vehicleType)) {
    return { ok: false, message: 'Please select a valid vehicle category.' };
  }
  fields.vehicleType = vehicleType;

  const make = String(fields.make || '').trim();
  if (!isValidVehicleMake(vehicleType, make)) {
    // Case-insensitive / fuzzy make match against catalog for this vehicle type.
    const catalogMakes = makesForVehicleType(vehicleType);
    const matched = catalogMakes.find((m) => m.toLowerCase() === make.toLowerCase());
    if (matched) {
      fields.make = matched;
    } else if (catalogMakes.includes('Other')) {
      fields.make = 'Other';
    } else {
      return { ok: false, message: 'Invalid or missing make for this vehicle category.' };
    }
  }

  const model = String(fields.model || '').trim();
  if (!model) return { ok: false, message: 'Model is required.' };
  if (model.length > 80) return { ok: false, message: 'Model is too long.' };

  const description = String(fields.description || '').trim();
  if (!description) return { ok: false, message: 'Description is required.' };

  const year = Number(fields.year);
  if (!Number.isInteger(year) || year < 1970 || year > CURRENT_YEAR + 1) {
    return { ok: false, message: `Year must be between 1970 and ${CURRENT_YEAR + 1}.` };
  }

  const km = Number(fields.kilometers);
  if (!Number.isFinite(km) || !Number.isInteger(km) || km < 0) {
    return { ok: false, message: 'Kilometres must be a non-negative whole number.' };
  }

  if (!TRANSMISSION_VALUES.includes(fields.transmission)) {
    return { ok: false, message: 'Transmission must be automatic or manual.' };
  }

  if (!FUEL_TYPE_VALUES.includes(fields.fuelType)) {
    return { ok: false, message: 'Invalid fuel type.' };
  }

  const price = Number(fields.price);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, message: 'Price must be a valid non-negative number.' };
  }

  if (!CURRENCY_VALUES.includes(fields.currency)) {
    return { ok: false, message: 'Currency must be EUR or LEK.' };
  }

  const color = String(fields.color || '').trim().toLowerCase();
  if (!COLOUR_VALUES.includes(color)) {
    // AI / free-text often sends unknown colours — fall back instead of rejecting the listing.
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
  if (!cityId || !isUuid(cityId)) {
    return { ok: false, message: 'Please select a valid city.' };
  }

  return { ok: true };
}

module.exports = {
  CAR_MAKES,
  VEHICLE_TYPE_VALUES,
  TRANSMISSION_VALUES,
  FUEL_TYPE_VALUES,
  COLOUR_VALUES,
  FINISH_VALUES,
  validateCarPayload,
};
