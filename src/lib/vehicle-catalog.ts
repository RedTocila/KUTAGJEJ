/** Vehicle type → make → models catalog for car listings. */

import catalogData from './vehicle-catalog-data.json';

export const VEHICLE_TYPES = [
  { value: 'car', label: 'Vetura' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Furgon' },
  { value: 'truck', label: 'Kamion' },
  { value: 'motorcycle', label: 'Motor' },
  { value: 'boat', label: 'Varkë' },
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number]['value'];

export const VEHICLE_TYPE_VALUES = VEHICLE_TYPES.map((t) => t.value);

export const VEHICLE_CATALOG = catalogData as Record<VehicleType, Record<string, string[]>>;

export function vehicleTypeLabel(value: string): string {
  return VEHICLE_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function makesForVehicleType(type: VehicleType | ''): string[] {
  if (!type || !(type in VEHICLE_CATALOG)) return [];
  return Object.keys(VEHICLE_CATALOG[type]);
}

export function modelsForMake(type: VehicleType | '', make: string): string[] {
  if (!type || !make || !(type in VEHICLE_CATALOG)) return [];
  return VEHICLE_CATALOG[type][make] ?? [];
}

export function isValidVehicleMake(type: string, make: string): boolean {
  if (!isVehicleType(type)) return false;
  return Boolean(VEHICLE_CATALOG[type][make]);
}

export function isValidVehicleModel(type: string, make: string, model: string): boolean {
  if (!isValidVehicleMake(type, make)) return false;
  return (VEHICLE_CATALOG[type as VehicleType][make] ?? []).includes(model);
}

export function isVehicleType(value: string): value is VehicleType {
  return (VEHICLE_TYPE_VALUES as readonly string[]).includes(value);
}

/** Flat unique make list across all types (legacy / search helpers). */
export function allVehicleMakes(): string[] {
  const set = new Set<string>();
  for (const type of VEHICLE_TYPE_VALUES) {
    for (const make of Object.keys(VEHICLE_CATALOG[type])) {
      set.add(make);
    }
  }
  return [...set].sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)));
}

export function findCatalogMakeInText(
  text: string,
  vehicleType?: VehicleType | '',
): { make: string; vehicleType: VehicleType } | null {
  const hay = String(text || '').toLowerCase();
  if (!hay) return null;

  const typesToCheck: VehicleType[] = vehicleType && isVehicleType(vehicleType)
    ? [vehicleType]
    : [...VEHICLE_TYPE_VALUES];

  for (const vType of typesToCheck) {
    const makes = makesForVehicleType(vType).filter((m) => m !== 'Other');
    const sorted = [...makes].sort((a, b) => b.length - a.length);
    for (const make of sorted) {
      const key = make.toLowerCase();
      const alt = key.replace(/[-_]/g, '[\\s-_]?');
      const re = new RegExp(`(?:^|[^a-z0-9])${alt}(?:[^a-z0-9]|$)`, 'i');
      if (re.test(hay)) {
        return { make, vehicleType: vType };
      }
    }
  }
  return null;
}

export function findCatalogModelInText(
  text: string,
  vehicleType: VehicleType | '',
  make: string,
): string | null {
  const hay = String(text || '').toLowerCase();
  if (!hay || !vehicleType || !make) return null;
  const hayLoose = hay.normalize('NFD').replace(/\p{M}/gu, '');
  const models = modelsForMake(vehicleType, make).filter((m) => m !== 'Other');
  const sorted = [...models].sort((a, b) => b.length - a.length);
  for (const model of sorted) {
    const key = model
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s*');
    const loose = key.normalize('NFD').replace(/\p{M}/gu, '');
    if (new RegExp(`(?:^|[^a-z0-9])${loose}(?:[^a-z0-9]|$)`, 'i').test(hayLoose)) {
      return model;
    }
  }
  if (make === 'Yamaha') {
    if (/\bt[\s-]?max\b/i.test(hay) || /\btmax\b/i.test(hay)) return 'TMAX';
    if (/\bt[eé]n[eé]r[eé]\b/i.test(hayLoose)) return 'Ténéré';
  }
  return null;
}

export function parseCarDetailsFromTitleOrText(
  input: string,
  hintVehicleType?: VehicleType | '',
): { vehicleType?: VehicleType; make?: string; model?: string; variant?: string } {
  const raw = String(input || '').trim();
  if (!raw) return {};

  const makeMatch = findCatalogMakeInText(raw, hintVehicleType);
  if (!makeMatch) return {};

  const vType = makeMatch.vehicleType;
  const make = makeMatch.make;
  const model = findCatalogModelInText(raw, vType, make);

  let variant = '';
  if (model) {
    // Attempt to extract variant by taking text after the make/model in the title
    const makeIdx = raw.toLowerCase().indexOf(make.toLowerCase().split(/[-\s]/)[0]);
    if (makeIdx !== -1) {
      const afterMake = raw.slice(makeIdx);
      const modelIdx = afterMake.toLowerCase().indexOf(model.toLowerCase());
      if (modelIdx !== -1) {
        const afterModel = afterMake.slice(modelIdx + model.length).trim();
        // Strip common prefixes or separators
        const cleaned = afterModel.replace(/^[-–—,:/|]+/, '').trim();
        if (cleaned && cleaned.length <= 50) {
          variant = cleaned;
        }
      }
    }
  }

  return {
    vehicleType: vType,
    make,
    model: model || undefined,
    variant: variant || undefined,
  };
}

