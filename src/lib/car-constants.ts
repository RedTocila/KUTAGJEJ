/** Constants for the car listing form. */

export {
  VEHICLE_TYPES,
  VEHICLE_TYPE_VALUES,
  vehicleTypeLabel,
  makesForVehicleType,
  modelsForMake,
  isValidVehicleMake,
  isValidVehicleModel,
  isVehicleType,
  allVehicleMakes,
  type VehicleType,
} from '@/lib/vehicle-catalog';

import { allVehicleMakes, makesForVehicleType } from '@/lib/vehicle-catalog';

/** @deprecated Prefer makesForVehicleType(vehicleType). Flat list of car-type makes for legacy filters. */
export const CAR_MAKES = makesForVehicleType('car');

export type CarMake = string;

/** All makes across vehicle types (search / SEO helpers). */
export const ALL_VEHICLE_MAKES = allVehicleMakes();

export const TRANSMISSION_OPTIONS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
] as const;

export const FUEL_TYPE_OPTIONS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'ethanol', label: 'Ethanol (FFV, E85, etc.)' },
  { value: 'hybrid-diesel', label: 'Hybrid (diesel/electric)' },
  { value: 'hybrid-petrol', label: 'Hybrid (petrol/electric)' },
  { value: 'hydrogen', label: 'Hydrogen' },
  { value: 'lpg', label: 'LPG' },
  { value: 'natural-gas', label: 'Natural Gas' },
  { value: 'plugin-hybrid', label: 'Plug-in hybrid' },
  { value: 'other', label: 'Other fuel type' },
] as const;

export function normalizeFuelType(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim().toLowerCase();
  if (!s) return '';
  if (FUEL_TYPE_OPTIONS.some((o) => o.value === s)) return s;
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
  return '';
}

export const CAR_COLOUR_OPTIONS = [
  { value: 'beige', label: 'Beige', hex: '#E8DCC8' },
  { value: 'blue', label: 'Blue', hex: '#2563EB' },
  { value: 'brown', label: 'Brown', hex: '#92400E' },
  { value: 'yellow', label: 'Yellow', hex: '#EAB308' },
  { value: 'gold', label: 'Gold', hex: '#D97706' },
  { value: 'green', label: 'Green', hex: '#16A34A' },
  { value: 'grey', label: 'Grey', hex: '#6B7280' },
  { value: 'orange', label: 'Orange', hex: '#EA580C' },
  { value: 'red', label: 'Red', hex: '#DC2626' },
  { value: 'black', label: 'Black', hex: '#111827' },
  { value: 'silver', label: 'Silver', hex: '#9CA3AF' },
  { value: 'purple', label: 'Purple', hex: '#7C3AED' },
  { value: 'white', label: 'White', hex: '#F9FAFB' },
] as const;

export const CAR_FINISH_OPTIONS = [
  { value: 'matte', label: 'Matte' },
  { value: 'metallic', label: 'Metallic' },
] as const;

export const CAR_EXTRAS = [
  'ABS',
  'Adaptive cornering lights',
  'Adaptive lighting',
  'Air suspension',
  'All season tyres',
  'Alloy wheels',
  'Bi-xenon headlights',
  'Blind spot assist',
  'Central locking',
  'Daytime running lights',
  'Disabled accessible',
  'Distance warning system',
  'Dynamic chassis control',
  'Electric tailgate',
  'Emergency brake assist',
  'Emergency tyre',
  'Emergency tyre repair kit',
  'ESP',
  'Fog lamps',
  'Folding roof',
  'Glare-free high beam headlights',
  'Headlight washer system',
  'Heated windshield',
  'High beam assist',
  'Hill-start assist',
  'Immobilizer',
  'Keyless central locking',
  'Lane change assist',
  'Laser headlights',
  'LED headlights',
  'LED running lights',
  'Light sensor',
  'Night vision assist',
  'Panoramic roof',
  'Power Assisted Steering',
  'Rain sensor',
  'Roof rack',
  'Spare tyre',
  'Speed limit control system',
  'Sports package',
  'Sports suspension',
  'Start-stop system',
  'Steel wheels',
  'Summer tyres',
  'Sunroof',
  'Tinted windows',
  'Traction control',
  'Traffic sign recognition',
  'Tyre pressure monitoring',
  'Winter package',
  'Winter tyres',
  'Xenon headlights',
] as const;

export type CarExtra = (typeof CAR_EXTRAS)[number];

/** Generate a sorted list of years from 1970 to current year. */
export function carYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 1970; y--) {
    years.push(y);
  }
  return years;
}
