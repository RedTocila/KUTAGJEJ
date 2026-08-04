/** Albanian labels for the real-estate listing form. */

export const REAL_ESTATE_PROPERTY_CATEGORIES = [
  { slug: 'apartment', label: 'Apartament' },
  { slug: 'villa', label: 'Vilë' },
  { slug: 'penthouse-duplex', label: 'Penthouse / dupleks' },
  { slug: 'part-of-villa', label: 'Pjesë vile' },
  { slug: 'room-studio-attic', label: 'Dhomë / studio / papafingo' },
  { slug: 'parking', label: 'Parking' },
  { slug: 'shop', label: 'Dyqan' },
  { slug: 'office', label: 'Zyrë' },
  { slug: 'industrial-shed', label: 'Kapanon industrial' },
  { slug: 'commercial-local', label: 'Lokal (bar / restorant)' },
  { slug: 'warehouse', label: 'Magazinë' },
  { slug: 'business-space', label: 'Hapësirë / strukturë biznesi' },
  { slug: 'building-plot', label: 'Truall ndërtimi' },
  { slug: 'agricultural-land', label: 'Tokë bujqësore' },
] as const;

export type RealEstatePropertySlug = (typeof REAL_ESTATE_PROPERTY_CATEGORIES)[number]['slug'];

export function propertyCategoryLabel(slug: string): string {
  const row = REAL_ESTATE_PROPERTY_CATEGORIES.find((c) => c.slug === slug);
  return row?.label ?? slug;
}

export const TRANSACTION_OPTIONS = [
  { value: 'rent', label: 'Qera' },
  { value: 'sale', label: 'Shitje' },
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
