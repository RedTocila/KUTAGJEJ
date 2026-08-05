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
