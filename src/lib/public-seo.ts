import { cache } from 'react';
import type { Metadata } from 'next';

import { config as siteConfig } from '@/config';
import { paths, pathsPublicLocationLanding } from '@/paths';
import { ALL_VEHICLE_MAKES, type CarMake } from '@/lib/car-constants';
import { JOB_INDUSTRY_OPTIONS } from '@/lib/job-constants';
import {
  BROWSE_PAGE_SIZE,
  BUSINESS_FILTER_OPTIONS,
  PROFESSIONAL_FILTER_OPTIONS,
  type BrowseFilters,
} from '@/lib/listing-filters';
import { MARKETPLACE_CATEGORY_OPTIONS } from '@/lib/marketplace-constants';
import {
  fetchBrowseBusinesses,
  fetchBrowseCars,
  fetchBrowseJobs,
  fetchBrowseMarketplace,
  fetchBrowseProfessionals,
  fetchBrowseRealEstate,
  type BrowseListingsResult,
  type PublicCarListing,
  type PublicDirectoryListing,
  type PublicJobListing,
  type PublicMarketplaceListing,
  type PublicRealEstateListing,
} from '@/lib/public-listings-client';
import {
  propertyCategoryLabel,
  REAL_ESTATE_PROPERTY_CATEGORIES,
  TRANSACTION_OPTIONS,
} from '@/lib/real-estate-constants';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { fetchPublicCities } from '@/lib/real-estate-locations-server';
import { safeServerJson } from '@/lib/server-fetch';

export type SeoVertical = 'real-estate' | 'cars' | 'jobs' | 'marketplace' | 'businesses' | 'professionals';

export type PublicSeoIndex = {
  cities: { id: string; name: string; slug: string }[];
  listings: { kind: string; id: string; path: string; lastModified: string }[];
  landings: { path: string; count: number; lastModified: string }[];
};

export type SeoLandingConfig = {
  vertical: SeoVertical;
  city: RealEstateCityDto | null;
  filters: BrowseFilters;
  path: string;
  heading: string;
  description: string;
  categoryLabel?: string;
  transactionLabel?: string;
};

export type SeoLandingListings =
  | BrowseListingsResult<PublicRealEstateListing>
  | BrowseListingsResult<PublicCarListing>
  | BrowseListingsResult<PublicJobListing>
  | BrowseListingsResult<PublicMarketplaceListing>
  | BrowseListingsResult<PublicDirectoryListing>;

const BASE_PATHS: Record<SeoVertical, string> = {
  'real-estate': paths.public.realEstate,
  cars: paths.public.cars,
  jobs: paths.public.jobs,
  marketplace: paths.public.marketplace,
  businesses: paths.public.businesses,
  professionals: paths.public.professionals,
};

const REAL_ESTATE_PATH_ALIASES: Record<string, string> = {
  apartamente: 'apartment',
  vila: 'villa',
  penthouse: 'penthouse-duplex',
  'pjese-vile': 'part-of-villa',
  'dhoma-studio': 'room-studio-attic',
  parking: 'parking',
  dyqane: 'shop',
  zyra: 'office',
  'kapanone-industriale': 'industrial-shed',
  'lokale-tregtare': 'commercial-local',
  magazina: 'warehouse',
  'ambiente-biznesi': 'business-space',
  truall: 'building-plot',
  'toke-bujqesore': 'agricultural-land',
};

const TRANSACTION_PATH_ALIASES: Record<string, string> = {
  'me-qera': 'rent',
  'ne-shitje': 'sale',
};

const VERTICAL_LABELS: Record<SeoVertical, string> = {
  'real-estate': 'Prona',
  cars: 'Makina',
  jobs: 'Punë',
  marketplace: 'Tregu',
  businesses: 'Biznese',
  professionals: 'Profesionistë',
};

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

export function seoSlug(value: string): string {
  return stripDiacritics(
    String(value || '')
      .trim()
      .toLowerCase()
  )
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export async function fetchPublicSeoIndex(): Promise<PublicSeoIndex | null> {
  return safeServerJson<PublicSeoIndex>('/public/listings/seo-index');
}

function findOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  segment: string
): { value: string; label: string } | null {
  const normalized = seoSlug(segment);
  return (
    options.find((option) => seoSlug(option.value) === normalized) ||
    options.find((option) => seoSlug(option.label) === normalized) ||
    null
  );
}

function cityForSegment(cities: RealEstateCityDto[], segment: string): RealEstateCityDto | null {
  const normalized = seoSlug(segment);
  return cities.find((city) => seoSlug(city.slug) === normalized || seoSlug(city.name) === normalized) || null;
}

function pluralRealEstateLabel(value: string): string {
  const labels: Record<string, string> = {
    apartment: 'Apartamente',
    villa: 'Vila',
    'penthouse-duplex': 'Penthouse dhe duplekse',
    'part-of-villa': 'Pjesë vilash',
    'room-studio-attic': 'Dhoma dhe studio',
    parking: 'Parkingje',
    shop: 'Dyqane',
    office: 'Zyra',
    'industrial-shed': 'Kapanone industriale',
    'commercial-local': 'Lokale tregtare',
    warehouse: 'Magazina',
    'business-space': 'Ambiente biznesi',
    'building-plot': 'Truall ndërtimi',
    'agricultural-land': 'Tokë bujqësore',
  };
  return labels[value] || propertyCategoryLabel(value);
}

export function getSeoLandingConfig(
  vertical: SeoVertical,
  segments: string[],
  cities: RealEstateCityDto[]
): SeoLandingConfig | null {
  if (segments.length < 1 || segments.length > 3) return null;
  const city = cityForSegment(cities, segments[0]);
  if (!city && segments.length === 1) {
    const base = `${BASE_PATHS[vertical].replace(/\/$/, '')}/${encodeURIComponent(segments[0])}`;
    if (vertical === 'real-estate') {
      const categorySlug =
        REAL_ESTATE_PATH_ALIASES[seoSlug(segments[0])] ||
        REAL_ESTATE_PROPERTY_CATEGORIES.find((item) => seoSlug(item.slug) === seoSlug(segments[0]))?.slug;
      if (!categorySlug) return null;
      const categoryLabel = pluralRealEstateLabel(categorySlug);
      return {
        vertical,
        city: null,
        filters: { cat: categorySlug },
        path: pathsPublicLocationLanding(BASE_PATHS[vertical], segments[0]),
        heading: `${categoryLabel} në Shqipëri`,
        description: `Shfletoni njoftime për ${categoryLabel.toLowerCase()} në Shqipëri, me çmime dhe detaje të publikuara nga përdoruesit.`,
        categoryLabel,
      };
    }
    let categoryValue = '';
    let categoryLabel = '';
    if (vertical === 'cars') {
      const make = (ALL_VEHICLE_MAKES as readonly CarMake[]).find((value) => seoSlug(value) === seoSlug(segments[0]));
      if (!make) return null;
      categoryValue = make;
      categoryLabel = make;
    } else if (vertical === 'jobs') {
      const option = findOptionLabel(JOB_INDUSTRY_OPTIONS, segments[0]);
      if (!option) return null;
      categoryValue = option.value;
      categoryLabel = option.label;
    } else if (vertical === 'marketplace') {
      const option = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, segments[0]);
      if (!option) return null;
      categoryValue = option.value;
      categoryLabel = option.label;
    } else {
      const options = vertical === 'businesses' ? BUSINESS_FILTER_OPTIONS : PROFESSIONAL_FILTER_OPTIONS;
      const option = findOptionLabel(options, segments[0]);
      if (!option) return null;
      categoryValue = option.value;
      categoryLabel = option.label;
    }
    const filters =
      vertical === 'cars'
        ? { make: categoryValue }
        : vertical === 'jobs'
          ? { industry: categoryValue }
          : vertical === 'marketplace'
            ? { cat: categoryValue }
            : { type: categoryValue };
    return {
      vertical,
      city: null,
      filters,
      path: base,
      heading: `${categoryLabel} në Shqipëri`,
      description: `Gjeni njoftime për ${categoryLabel.toLowerCase()} në Shqipëri. Shfletoni informacionin dhe kontaktoni drejtpërdrejt publikuesit.`,
      categoryLabel,
    };
  }
  if (!city) return null;

  const base = pathsPublicLocationLanding(BASE_PATHS[vertical], city.slug);
  const cityFilters = { city: city.id };

  if (vertical === 'real-estate') {
    if (segments.length === 1) {
      return {
        vertical,
        city,
        filters: cityFilters,
        path: base,
        heading: `Prona në ${city.name}`,
        description: `Shfletoni njoftime të verifikuara për prona në ${city.name}, me çmime dhe detaje të publikuara nga përdoruesit.`,
      };
    }
    const categorySlug =
      REAL_ESTATE_PATH_ALIASES[seoSlug(segments[1])] ||
      REAL_ESTATE_PROPERTY_CATEGORIES.find((item) => seoSlug(item.slug) === seoSlug(segments[1]))?.slug;
    if (!categorySlug) return null;
    const categoryLabel = pluralRealEstateLabel(categorySlug);
    if (segments.length === 2) {
      return {
        vertical,
        city,
        filters: { ...cityFilters, cat: categorySlug },
        path: pathsPublicLocationLanding(
          BASE_PATHS[vertical],
          city.slug,
          REAL_ESTATE_PATH_ALIASES[seoSlug(segments[1])] || categorySlug
        ),
        heading: `${categoryLabel} në ${city.name}`,
        description: `Gjeni ${categoryLabel.toLowerCase()} në ${city.name} me informacion real për çmimin, sipërfaqen dhe karakteristikat e pronës.`,
        categoryLabel,
      };
    }
    const transactionSlug =
      TRANSACTION_PATH_ALIASES[seoSlug(segments[2])] ||
      TRANSACTION_OPTIONS.find((item) => seoSlug(item.value) === seoSlug(segments[2]))?.value;
    if (!transactionSlug) return null;
    const transactionLabel = transactionSlug === 'rent' ? 'me qira' : 'në shitje';
    return {
      vertical,
      city,
      filters: { ...cityFilters, cat: categorySlug, tx: transactionSlug },
      path: pathsPublicLocationLanding(
        BASE_PATHS[vertical],
        city.slug,
        REAL_ESTATE_PATH_ALIASES[seoSlug(segments[1])] || categorySlug,
        TRANSACTION_PATH_ALIASES[seoSlug(segments[2])] || transactionSlug
      ),
      heading: `${categoryLabel} ${transactionLabel} në ${city.name}`,
      description: `Shfletoni ${categoryLabel.toLowerCase()} ${transactionLabel} në ${city.name}. Krahasojini njoftimet sipas çmimit, sipërfaqes dhe detajeve të publikuara.`,
      categoryLabel,
      transactionLabel,
    };
  }

  if (segments.length !== 1 && segments.length !== 2) return null;
  if (segments.length === 1) {
    return {
      vertical,
      city,
      filters: cityFilters,
      path: base,
      heading: `${VERTICAL_LABELS[vertical]} në ${city.name}`,
      description: `Shfletoni njoftime aktive për ${VERTICAL_LABELS[vertical].toLowerCase()} në ${city.name}, me informacion të publikuar nga ofruesit.`,
    };
  }

  let categoryValue = '';
  let categoryLabel = '';
  if (vertical === 'cars') {
    const make = (ALL_VEHICLE_MAKES as readonly CarMake[]).find((value) => seoSlug(value) === seoSlug(segments[1]));
    if (!make) return null;
    categoryValue = make;
    categoryLabel = make;
  } else if (vertical === 'jobs') {
    const option = findOptionLabel(JOB_INDUSTRY_OPTIONS, segments[1]);
    if (!option) return null;
    categoryValue = option.value;
    categoryLabel = option.label;
  } else if (vertical === 'marketplace') {
    const option = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, segments[1]);
    if (!option) return null;
    categoryValue = option.value;
    categoryLabel = option.label;
  } else {
    const options = vertical === 'businesses' ? BUSINESS_FILTER_OPTIONS : PROFESSIONAL_FILTER_OPTIONS;
    const option = findOptionLabel(options, segments[1]);
    if (!option) return null;
    categoryValue = option.value;
    categoryLabel = option.label;
  }

  const filters =
    vertical === 'cars'
      ? { ...cityFilters, make: categoryValue }
      : vertical === 'jobs'
        ? { ...cityFilters, industry: categoryValue }
        : vertical === 'marketplace'
          ? { ...cityFilters, cat: categoryValue }
          : { ...cityFilters, type: categoryValue };
  return {
    vertical,
    city,
    filters,
    path: pathsPublicLocationLanding(BASE_PATHS[vertical], city.slug, seoSlug(segments[1])),
    heading: `${categoryLabel} në ${city.name}`,
    description: `Gjeni njoftime për ${categoryLabel.toLowerCase()} në ${city.name}. Shfletoni informacionin dhe kontaktoni drejtpërdrejt publikuesit.`,
    categoryLabel,
  };
}

export async function fetchSeoLandingListings(config: SeoLandingConfig, page = 1): Promise<SeoLandingListings> {
  switch (config.vertical) {
    case 'real-estate':
      return fetchBrowseRealEstate(BROWSE_PAGE_SIZE, config.filters, page);
    case 'cars':
      return fetchBrowseCars(BROWSE_PAGE_SIZE, config.filters, page);
    case 'jobs':
      return fetchBrowseJobs(BROWSE_PAGE_SIZE, config.filters, page);
    case 'marketplace':
      return fetchBrowseMarketplace(BROWSE_PAGE_SIZE, config.filters, page);
    case 'businesses':
      return fetchBrowseBusinesses(BROWSE_PAGE_SIZE, config.filters, page);
    case 'professionals':
      return fetchBrowseProfessionals(BROWSE_PAGE_SIZE, config.filters, page);
  }
}

export const loadSeoLandingRoute = cache(async function loadSeoLandingRoute(vertical: SeoVertical, segments: string[]) {
  const cities = await fetchPublicCities();
  const config = getSeoLandingConfig(vertical, segments, cities);
  if (!config) return { config: null, cities, result: null };
  const result = await fetchSeoLandingListings(config);
  return { config, cities, result };
});

export function seoLandingMetadata(config: SeoLandingConfig, total: number, indexable: boolean): Metadata {
  const canonical = config.path;
  return {
    title: config.heading,
    description: config.description,
    alternates: { canonical },
    robots: { index: indexable, follow: true },
    openGraph: {
      title: `${config.heading} | KuTaGjej`,
      description: config.description,
      url: new URL(canonical.replace(/^\//, ''), siteConfig.site.url).toString(),
      type: 'website',
      locale: 'sq_AL',
    },
    other: { 'listing-count': String(total) },
  };
}
