import type { HomeVerticalId } from '@/lib/home-categories';
import {
  CAR_MAKES,
  FUEL_TYPE_OPTIONS,
  TRANSMISSION_OPTIONS,
  VEHICLE_TYPES,
  makesForVehicleType,
  modelsForMake,
  type VehicleType,
} from '@/lib/car-constants';
import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { REAL_ESTATE_PROPERTY_CATEGORIES, TRANSACTION_OPTIONS } from '@/lib/real-estate-constants';

export type BrowseSort = 'newest' | 'price-asc' | 'price-desc';

export interface BrowseRealEstateFilters {
  cat?: string;
  tx?: string;
  city?: string;
  zone?: string[];
  minPrice?: string;
  maxPrice?: string;
  minSurface?: string;
  bedrooms?: string;
  q?: string;
  sort?: BrowseSort;
}

export interface BrowseCarFilters {
  type?: string;
  fuel?: string;
  make?: string;
  model?: string;
  transmission?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  minYear?: string;
  maxYear?: string;
  maxKm?: string;
  q?: string;
  sort?: BrowseSort;
}

export interface BrowseJobFilters {
  industry?: string;
  jobType?: string;
  workLocation?: string;
  education?: string;
  experience?: string;
  city?: string;
  q?: string;
  sort?: BrowseSort;
}

export interface BrowseMarketplaceFilters {
  cat?: string;
  condition?: string;
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  q?: string;
  sort?: BrowseSort;
}

export interface BrowseDirectoryFilters {
  type?: string;
  city?: string;
  q?: string;
  sort?: BrowseSort;
}

export interface BrowseOkazionFilters {
  /** Main category vertical (`cars`, `real-estate`, …). */
  kind?: HomeVerticalId;
  q?: string;
}

/** Vertical browse filters (city/sort/etc). Okazion is a separate shape. */
export type BrowseVerticalFilters =
  | BrowseRealEstateFilters
  | BrowseCarFilters
  | BrowseJobFilters
  | BrowseMarketplaceFilters
  | BrowseDirectoryFilters;

export type BrowseFilters = BrowseVerticalFilters | BrowseOkazionFilters;

export const BROWSE_PAGE_SIZE = 24;

export const BROWSE_SORT_OPTIONS = [
  { value: 'newest', label: 'Më të rejat' },
  { value: 'price-asc', label: 'Çmimi ↑' },
  { value: 'price-desc', label: 'Çmimi ↓' },
] as const;

export const BUSINESS_FILTER_OPTIONS = [
  { value: 'restorant', label: 'Restorant' },
  { value: 'bar', label: 'Bar & pub' },
  { value: 'kafe', label: 'Kafene' },
  { value: 'brunch', label: 'Brunch & mëngjes' },
  { value: 'piceri-fast-food', label: 'Piceri & fast food' },
  { value: 'pasticeri', label: 'Pastiçeri & ëmbëlsira' },
] as const;

export const PROFESSIONAL_FILTER_OPTIONS = [
  { value: 'freelance', label: 'Freelance' },
  { value: 'konsulent', label: 'Konsulence' },
  { value: 'dizajn-it', label: 'Dizajn & IT' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'mjekesi', label: 'Mjekësi' },
  { value: 'arsim', label: 'Arsim' },
  { value: 'sherbim', label: 'Shërbime profesionale' },
  { value: 'kurse', label: 'Kurse & trajnim' },
] as const;

type SearchParamsInput = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function allParams(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter(Boolean);
  const single = String(value ?? '').trim();
  return single ? [single] : [];
}

/** URL / draft may expose `zone` as a string or array — always normalize for UI logic. */
export function normalizeZoneIds(zone: string[] | string | undefined): string[] {
  if (!zone) return [];
  if (Array.isArray(zone)) return zone.map((v) => String(v).trim()).filter(Boolean);
  const single = String(zone).trim();
  return single ? [single] : [];
}

/** Preserves repeated query keys (e.g. multiple `zone` values). */
export function searchParamsToRecord(params: URLSearchParams): SearchParamsInput {
  const record: SearchParamsInput = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    record[key] = values.length > 1 ? values : values[0] ?? '';
  }
  return record;
}

function appendQueryValues(qs: URLSearchParams, key: string, value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const trimmed = String(item ?? '').trim();
      if (trimmed) qs.append(key, trimmed);
    }
    return;
  }
  const trimmed = String(value ?? '').trim();
  if (trimmed) qs.set(key, trimmed);
}

function parseSort(value: string): BrowseSort | undefined {
  if (value === 'newest' || value === 'price-asc' || value === 'price-desc') return value;
  return undefined;
}

export function parseBrowsePage(searchParams: SearchParamsInput): number {
  const n = Number.parseInt(firstParam(searchParams.page), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

const OKAZION_KIND_VALUES = new Set<HomeVerticalId>([
  'real-estate',
  'cars',
  'jobs',
  'marketplace',
]);

export function parseOkazionBrowseParams(searchParams: SearchParamsInput): BrowseOkazionFilters {
  const rawKind = firstParam(searchParams.kind).trim() as HomeVerticalId;
  const kind = OKAZION_KIND_VALUES.has(rawKind) ? rawKind : undefined;
  const q = firstParam(searchParams.q).trim() || undefined;
  return { kind, q };
}

export function parseBrowseSearchParams(
  verticalId: HomeVerticalId,
  searchParams: SearchParamsInput,
): BrowseFilters {
  const sort = parseSort(firstParam(searchParams.sort));
  const city = firstParam(searchParams.city).trim() || undefined;
  const q = firstParam(searchParams.q).trim() || undefined;

  switch (verticalId) {
    case 'real-estate': {
      const zones = allParams(searchParams.zone);
      return {
        cat: firstParam(searchParams.cat).trim() || undefined,
        tx: firstParam(searchParams.tx).trim() || undefined,
        city,
        zone: zones.length ? zones : undefined,
        minPrice: firstParam(searchParams.minPrice).trim() || undefined,
        maxPrice: firstParam(searchParams.maxPrice).trim() || undefined,
        minSurface: firstParam(searchParams.minSurface).trim() || undefined,
        bedrooms: firstParam(searchParams.bedrooms).trim() || undefined,
        q,
        sort,
      };
    }
    case 'cars':
      return {
        type: firstParam(searchParams.type).trim() || undefined,
        fuel: firstParam(searchParams.fuel).trim() || undefined,
        make: firstParam(searchParams.make).trim() || undefined,
        model: firstParam(searchParams.model).trim() || undefined,
        transmission: firstParam(searchParams.transmission).trim() || undefined,
        city,
        minPrice: firstParam(searchParams.minPrice).trim() || undefined,
        maxPrice: firstParam(searchParams.maxPrice).trim() || undefined,
        minYear: firstParam(searchParams.minYear).trim() || undefined,
        maxYear: firstParam(searchParams.maxYear).trim() || undefined,
        maxKm: firstParam(searchParams.maxKm).trim() || undefined,
        q,
        sort,
      };
    case 'jobs':
      return {
        industry: firstParam(searchParams.industry).trim() || undefined,
        jobType: firstParam(searchParams.jobType).trim() || undefined,
        workLocation: firstParam(searchParams.workLocation).trim() || undefined,
        education: firstParam(searchParams.education).trim() || undefined,
        experience: firstParam(searchParams.experience).trim() || undefined,
        city,
        q,
        sort,
      };
    case 'marketplace':
      return {
        cat: firstParam(searchParams.cat).trim() || undefined,
        condition: firstParam(searchParams.condition).trim() || undefined,
        city,
        minPrice: firstParam(searchParams.minPrice).trim() || undefined,
        maxPrice: firstParam(searchParams.maxPrice).trim() || undefined,
        q,
        sort,
      };
    case 'businesses':
    case 'professionals':
      return {
        type: firstParam(searchParams.type).trim() || undefined,
        city,
        q,
        sort,
      };
    default:
      return {};
  }
}


export function buildBrowseApiQuery(filters: BrowseFilters, limit = BROWSE_PAGE_SIZE, page = 1): string {
  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  if (page > 1) qs.set('page', String(page));

  for (const [key, value] of Object.entries(filters)) {
    appendQueryValues(qs, key, value as string | string[] | undefined);
  }

  return `?${qs.toString()}`;
}

export function buildBrowseUrlQuery(filters: BrowseFilters, page = 1): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    appendQueryValues(qs, key, value as string | string[] | undefined);
  }
  if (page > 1) qs.set('page', String(page));
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function hasActiveBrowseFilters(filters: BrowseFilters): boolean {
  return countActiveBrowseFilters(filters) > 0;
}

export function countActiveBrowseFilters(filters: BrowseFilters): number {
  return Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) return count + value.filter((v) => Boolean(String(v).trim())).length;
    return count + (Boolean(String(value ?? '').trim()) ? 1 : 0);
  }, 0);
}

function findLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | undefined,
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

export interface ActiveFilterChip {
  key: string;
  label: string;
}

export function getActiveFilterChips(
  verticalId: HomeVerticalId,
  filters: BrowseVerticalFilters,
  cities?: ReadonlyArray<{ id: string; name: string; zones?: ReadonlyArray<{ id: string; name: string }> }>,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  const push = (key: string, label: string) => {
    chips.push({ key, label });
  };

  const sortLabel = findLabel(BROWSE_SORT_OPTIONS, filters.sort);
  if (sortLabel && filters.sort && filters.sort !== 'newest') {
    push('sort', sortLabel);
  }

  const cityId = filters.city;
  if (cityId) {
    const cityName = cities?.find((c) => c.id === cityId)?.name;
    push('city', cityName || 'Qyteti');
  }

  if (verticalId === 'real-estate') {
    const zones = normalizeZoneIds((filters as BrowseRealEstateFilters).zone);
    const city = cities?.find((c) => c.id === cityId);
    for (const zoneId of zones) {
      const zoneName = city?.zones?.find((z) => z.id === zoneId)?.name;
      push(`zone:${zoneId}`, zoneName || 'Zona');
    }
  }

  switch (verticalId) {
    case 'real-estate': {
      const f = filters as BrowseRealEstateFilters;
      const cat = findLabel(
        REAL_ESTATE_PROPERTY_CATEGORIES.map((c) => ({ value: c.slug, label: c.label })),
        f.cat,
      );
      if (cat) push('cat', cat);
      const tx = findLabel(TRANSACTION_OPTIONS, f.tx);
      if (tx) push('tx', tx);
      if (f.minPrice) push('minPrice', `Min ${f.minPrice}`);
      if (f.maxPrice) push('maxPrice', `Max ${f.maxPrice}`);
      if (f.minSurface) push('minSurface', `≥ ${f.minSurface} m²`);
      if (f.bedrooms) push('bedrooms', `≥ ${f.bedrooms} dhoma`);
      // Keyword `q` is shown in the main search input — omit from chips.
      break;
    }
    case 'cars': {
      const f = filters as BrowseCarFilters;
      const type = findLabel(
        VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label })),
        f.type,
      );
      if (type) push('type', type);
      const fuel = findLabel(FUEL_TYPE_OPTIONS, f.fuel);
      if (fuel) push('fuel', fuel);
      if (f.make) push('make', f.make);
      if (f.model) push('model', f.model);
      const transmission = findLabel(TRANSMISSION_OPTIONS, f.transmission);
      if (transmission) push('transmission', transmission);
      if (f.minPrice) push('minPrice', `Min ${f.minPrice}`);
      if (f.maxPrice) push('maxPrice', `Max ${f.maxPrice}`);
      if (f.minYear) push('minYear', `Nga ${f.minYear}`);
      if (f.maxYear) push('maxYear', `Deri ${f.maxYear}`);
      if (f.maxKm) push('maxKm', `≤ ${f.maxKm} km`);
      break;
    }
    case 'jobs': {
      const f = filters as BrowseJobFilters;
      const industry = findLabel(JOB_INDUSTRY_OPTIONS, f.industry);
      if (industry) push('industry', industry);
      const jobType = findLabel(JOB_TYPE_OPTIONS, f.jobType);
      if (jobType) push('jobType', jobType);
      const workLocation = findLabel(WORK_LOCATION_OPTIONS, f.workLocation);
      if (workLocation) push('workLocation', workLocation);
      const education = findLabel(JOB_EDUCATION_OPTIONS, f.education);
      if (education) push('education', education);
      const experience = findLabel(JOB_EXPERIENCE_OPTIONS, f.experience);
      if (experience) push('experience', experience);
      break;
    }
    case 'marketplace': {
      const f = filters as BrowseMarketplaceFilters;
      const cat = findLabel(MARKETPLACE_CATEGORY_OPTIONS, f.cat);
      if (cat) push('cat', cat);
      const condition = findLabel(MARKETPLACE_CONDITION_OPTIONS, f.condition);
      if (condition) push('condition', condition);
      if (f.minPrice) push('minPrice', `Min ${f.minPrice}`);
      if (f.maxPrice) push('maxPrice', `Max ${f.maxPrice}`);
      break;
    }
    case 'businesses': {
      const f = filters as BrowseDirectoryFilters;
      const type = findLabel(BUSINESS_FILTER_OPTIONS, f.type);
      if (type) push('type', type);
      break;
    }
    case 'professionals': {
      const f = filters as BrowseDirectoryFilters;
      const type = findLabel(PROFESSIONAL_FILTER_OPTIONS, f.type);
      if (type) push('type', type);
      break;
    }
    default:
      break;
  }

  return chips;
}

export function removeBrowseFilterKey(filters: BrowseFilters, key: string): BrowseFilters {
  const next = { ...filters } as Record<string, string | string[] | undefined>;
  if (key.startsWith('zone:')) {
    const zoneId = key.slice('zone:'.length);
    const current = (next.zone as string[] | undefined) ?? [];
    const remaining = current.filter((id) => id !== zoneId);
    if (remaining.length) next.zone = remaining;
    else delete next.zone;
    return next as BrowseFilters;
  }
  delete next[key];
  if (key === 'city') delete next.zone;
  if (key === 'type') {
    delete next.make;
    delete next.model;
  }
  if (key === 'make') delete next.model;
  return next as BrowseFilters;
}

export function getFilterFieldConfig(verticalId: HomeVerticalId) {
  switch (verticalId) {
    case 'real-estate':
      return {
        categories: REAL_ESTATE_PROPERTY_CATEGORIES.map((c) => ({ value: c.slug, label: c.label })),
        transactions: TRANSACTION_OPTIONS,
        sortOptions: BROWSE_SORT_OPTIONS,
      };
    case 'cars':
      return {
        vehicleTypes: VEHICLE_TYPES.map((t) => ({ value: t.value, label: t.label })),
        fuelTypes: FUEL_TYPE_OPTIONS,
        makes: CAR_MAKES.map((m) => ({ value: m, label: m })),
        makesForType: (vehicleType: string) =>
          makesForVehicleType(vehicleType as VehicleType).map((m) => ({ value: m, label: m })),
        modelsForTypeMake: (vehicleType: string, make: string) =>
          modelsForMake(vehicleType as VehicleType | '', make).map((m) => ({ value: m, label: m })),
        transmissions: TRANSMISSION_OPTIONS,
        sortOptions: BROWSE_SORT_OPTIONS,
      };
    case 'jobs':
      return {
        industries: JOB_INDUSTRY_OPTIONS,
        jobTypes: JOB_TYPE_OPTIONS,
        workLocations: WORK_LOCATION_OPTIONS,
        educationLevels: JOB_EDUCATION_OPTIONS,
        experienceLevels: JOB_EXPERIENCE_OPTIONS,
        sortOptions: BROWSE_SORT_OPTIONS,
      };
    case 'marketplace':
      return {
        categories: MARKETPLACE_CATEGORY_OPTIONS,
        conditions: MARKETPLACE_CONDITION_OPTIONS,
        sortOptions: BROWSE_SORT_OPTIONS,
      };
    case 'businesses':
      return {
        types: BUSINESS_FILTER_OPTIONS,
        sortOptions: BROWSE_SORT_OPTIONS,
      };
    case 'professionals':
      return {
        types: PROFESSIONAL_FILTER_OPTIONS,
        sortOptions: BROWSE_SORT_OPTIONS,
      };
    default:
      return { sortOptions: BROWSE_SORT_OPTIONS };
  }
}
