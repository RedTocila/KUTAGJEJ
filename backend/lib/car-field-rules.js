/** Server-side validation rules for car listings (mirrors frontend car-constants.ts). */

const CAR_MAKES = [
  'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Bugatti', 'Cadillac',
  'Chevrolet', 'Chrysler', 'Citroën', 'Dacia', 'Dodge', 'Ferrari', 'Fiat', 'Ford',
  'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini',
  'Land Rover', 'Lexus', 'Lincoln', 'Maserati', 'Mazda', 'Mercedes-Benz', 'Mini',
  'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'Rolls-Royce',
  'Seat', 'Skoda', 'Smart', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen',
  'Volvo', 'Other',
];

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

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/**
 * Validates a car listing payload (fields already extracted from multipart or JSON).
 * Returns { ok: true } or { ok: false, message }.
 */
function validateCarPayload(fields) {
  const make = String(fields.make || '').trim();
  if (!CAR_MAKES.includes(make)) {
    return { ok: false, message: 'Invalid or missing car make.' };
  }

  const model = String(fields.model || '').trim();
  if (!model) return { ok: false, message: 'Car model is required.' };
  if (model.length > 80) return { ok: false, message: 'Car model is too long.' };

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
    return { ok: false, message: 'Invalid exterior colour.' };
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

  const cityId = String(fields.cityId || '').trim();
  if (!cityId || !OBJECT_ID_RE.test(cityId)) {
    return { ok: false, message: 'Please select a valid city.' };
  }

  return { ok: true };
}

module.exports = {
  CAR_MAKES,
  TRANSMISSION_VALUES,
  FUEL_TYPE_VALUES,
  COLOUR_VALUES,
  FINISH_VALUES,
  validateCarPayload,
};
