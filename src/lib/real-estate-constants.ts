import { DEFAULT_LANGUAGE, localizedLabel, type AppLanguage } from '@/lib/language';

/** Albanian labels for the real-estate listing form. English via `labelEn`. */

export const REAL_ESTATE_PROPERTY_CATEGORIES = [
  { slug: 'apartment', label: 'Apartament', labelEn: 'Apartment' },
  { slug: 'villa', label: 'Vilë', labelEn: 'Villa' },
  { slug: 'penthouse-duplex', label: 'Penthouse / dupleks', labelEn: 'Penthouse / duplex' },
  { slug: 'part-of-villa', label: 'Pjesë vile', labelEn: 'Part of villa' },
  { slug: 'room-studio-attic', label: 'Dhomë / studio / papafingo', labelEn: 'Room / studio / attic' },
  { slug: 'parking', label: 'Parking', labelEn: 'Parking' },
  { slug: 'shop', label: 'Dyqan', labelEn: 'Shop' },
  { slug: 'office', label: 'Zyrë', labelEn: 'Office' },
  { slug: 'industrial-shed', label: 'Kapanon industrial', labelEn: 'Industrial shed' },
  { slug: 'commercial-local', label: 'Lokal (bar / restorant)', labelEn: 'Commercial space (bar / restaurant)' },
  { slug: 'warehouse', label: 'Magazinë', labelEn: 'Warehouse' },
  { slug: 'business-space', label: 'Hapësirë / strukturë biznesi', labelEn: 'Business space / structure' },
  { slug: 'building-plot', label: 'Truall ndërtimi', labelEn: 'Building plot' },
  { slug: 'agricultural-land', label: 'Tokë bujqësore', labelEn: 'Agricultural land' },
] as const;

export type RealEstatePropertySlug = (typeof REAL_ESTATE_PROPERTY_CATEGORIES)[number]['slug'];

export function propertyCategoryLabel(slug: string, language: AppLanguage = DEFAULT_LANGUAGE): string {
  const row = REAL_ESTATE_PROPERTY_CATEGORIES.find((c) => c.slug === slug);
  if (!row) return slug;
  return localizedLabel(language, row.label, row.labelEn);
}

export const TRANSACTION_OPTIONS = [
  { value: 'rent', label: 'Qera', labelEn: 'For rent' },
  { value: 'sale', label: 'Shitje', labelEn: 'For sale' },
] as const;

export const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR' },
  { value: 'LEK', label: 'LEK' },
] as const;

export const CONDITION_OPTIONS = [
  { value: 'new', label: 'I ri' },
  { value: 'in-construction', label: 'Në ndërtim' },
  { value: 'renovated', label: 'I rinovuar' },
  { value: 'good-condition', label: 'Në gjendje të mirë' },
] as const;

export const FURNISHING_OPTIONS = [
  { value: 'furnished', label: 'I mobiluar' },
  { value: 'unfurnished', label: 'Pa mobilim' },
  { value: 'partially-furnished', label: 'Pjesërisht i mobiluar' },
  { value: 'kitchen-only', label: 'Vetëm kuzhinë' },
] as const;

/** Which extra fields apply for a property category (mirrors backend rules). */
export function needsCondition(cat: RealEstatePropertySlug | ''): boolean {
  if (!cat) return false;
  const no = new Set<RealEstatePropertySlug>([
    'parking',
    'warehouse',
    'building-plot',
    'agricultural-land',
    'villa',
  ]);
  return !no.has(cat);
}

export function needsFloor(cat: RealEstatePropertySlug | ''): boolean {
  return cat === 'apartment';
}

export function needsTotalFloors(cat: RealEstatePropertySlug | ''): boolean {
  return cat === 'villa';
}

export function needsParkingFloor(cat: RealEstatePropertySlug | ''): boolean {
  return cat === 'parking';
}

export function needsBedroomsBathFurnishing(cat: RealEstatePropertySlug | ''): boolean {
  return new Set<RealEstatePropertySlug>([
    'apartment',
    'villa',
    'penthouse-duplex',
    'part-of-villa',
    'room-studio-attic',
  ]).has(cat as RealEstatePropertySlug);
}

export function needsYearBuilt(cat: RealEstatePropertySlug | ''): boolean {
  return cat === 'apartment';
}
