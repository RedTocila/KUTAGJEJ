/** English labels for the real-estate listing form (i18n later). */

export const REAL_ESTATE_PROPERTY_CATEGORIES = [
  { slug: 'apartment', label: 'Apartment' },
  { slug: 'villa', label: 'Villa' },
  { slug: 'penthouse-duplex', label: 'Penthouse / duplex' },
  { slug: 'part-of-villa', label: 'Part of a villa' },
  { slug: 'room-studio-attic', label: 'Room / studio / attic' },
  { slug: 'parking', label: 'Parking' },
  { slug: 'shop', label: 'Shop' },
  { slug: 'office', label: 'Office' },
  { slug: 'industrial-shed', label: 'Industrial shed' },
  { slug: 'commercial-local', label: 'Commercial unit (bar / restaurant)' },
  { slug: 'warehouse', label: 'Warehouse' },
  { slug: 'business-space', label: 'Business space / structure' },
  { slug: 'building-plot', label: 'Building plot' },
  { slug: 'agricultural-land', label: 'Agricultural land' },
] as const;

export type RealEstatePropertySlug = (typeof REAL_ESTATE_PROPERTY_CATEGORIES)[number]['slug'];

export function propertyCategoryLabel(slug: string): string {
  const row = REAL_ESTATE_PROPERTY_CATEGORIES.find((c) => c.slug === slug);
  return row?.label ?? slug;
}

export const TRANSACTION_OPTIONS = [
  { value: 'rent', label: 'Rent' },
  { value: 'sale', label: 'Sale' },
] as const;

export const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR' },
  { value: 'LEK', label: 'LEK' },
] as const;

export const CONDITION_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'in-construction', label: 'In construction' },
  { value: 'renovated', label: 'Renovated' },
  { value: 'good-condition', label: 'In good condition' },
] as const;

export const FURNISHING_OPTIONS = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'partially-furnished', label: 'Partially furnished' },
  { value: 'kitchen-only', label: 'Kitchen only' },
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
