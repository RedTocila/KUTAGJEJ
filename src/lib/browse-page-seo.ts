import type { Metadata } from 'next';

import { config } from '@/config';
import { findVertical, type HomeVerticalId } from '@/lib/home-categories';
import { CAR_MAKES, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS } from '@/lib/car-constants';
import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import {
  buildBrowseUrlQuery,
  BUSINESS_FILTER_OPTIONS,
  parseBrowseSearchParams,
  parseBrowsePage,
  PROFESSIONAL_FILTER_OPTIONS,
  type BrowseCarFilters,
  type BrowseDirectoryFilters,
  type BrowseFilters,
  type BrowseJobFilters,
  type BrowseMarketplaceFilters,
  type BrowseRealEstateFilters,
} from '@/lib/listing-filters';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { formatBrowseLocationPhrase, formatCityLocationPhrase } from '@/lib/location-display';
import { fetchPublicCities } from '@/lib/real-estate-locations-server';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

type SearchParamsInput = Record<string, string | string[] | undefined>;

const REAL_ESTATE_CAT_SEO: Record<string, { title: string; singular: string }> = {
  apartment: { title: 'Apartamente', singular: 'apartament' },
  villa: { title: 'Vila', singular: 'vila' },
  'penthouse-duplex': { title: 'Penthouse', singular: 'penthouse' },
  'part-of-villa': { title: 'Pjesë vilë', singular: 'pjesë vilë' },
  'room-studio-attic': { title: 'Dhoma & studio', singular: 'dhomë/studio' },
  parking: { title: 'Parking', singular: 'parking' },
  shop: { title: 'Dyqane', singular: 'dyqan' },
  office: { title: 'Zyra', singular: 'zyrë' },
  'industrial-shed': { title: 'Halla industriale', singular: 'hallë industriale' },
  'commercial-local': { title: 'Lokale tregtare', singular: 'lokal tregtar' },
  warehouse: { title: 'Magazina', singular: 'magazinë' },
  'business-space': { title: 'Ambiente biznesi', singular: 'ambient biznesi' },
  'building-plot': { title: 'Tokë', singular: 'tokë' },
  'agricultural-land': { title: 'Tokë bujqësore', singular: 'tokë bujqësore' },
};

const TX_SEO: Record<string, { title: string; singular: string }> = {
  rent: { title: 'me qera', singular: 'me qera' },
  sale: { title: 'për shitje', singular: 'për shitje' },
};

const FUEL_SEO: Record<string, string> = {
  petrol: 'benzinë',
  diesel: 'naftë',
  'hybrid-petrol': 'hibrid',
  'hybrid-diesel': 'hibrid',
  electric: 'elektrik',
  lpg: 'GPL',
  other: 'të tjera',
};

const DEFAULT_SEO: Record<HomeVerticalId, { title: string; description: string }> = {
  'real-estate': {
    title: 'Prona — Apartamente, vila & ambiente biznesi',
    description:
      'Shfleto njoftimet e fundit për shtëpi, apartamente, vila, ambiente biznesi, dyqane dhe toka në KuTaGjej. Posto njoftim falas dhe gjej blerës ose qiramarrës shpejt.',
  },
  cars: {
    title: 'Makina — Makina, motora dhe mjete pune për shitje',
    description:
      'Eksploro shitjet e makinave në Shqipëri — makina, motora, mjete pune dhe pjesë këmbimi. Foto, çmime dhe specifika në KuTaGjej.',
  },
  jobs: {
    title: 'Punë — Vende të lira pune në Shqipëri',
    description:
      'Gjej vendin e ri të punës — full-time, part-time, remote, freelance dhe sezonale. Shfleto njoftimet e reja për punë në KuTaGjej.',
  },
  marketplace: {
    title: 'Tregu — Elektronikë, mobilje, veshje dhe shumë më tepër',
    description:
      'Shfleto njoftimet e tregut online — elektronikë, mobilje, veshje, libra, sport, lodra dhe shumë më tepër. Shitje të reja çdo ditë në KuTaGjej.',
  },
  businesses: {
    title: 'Biznese — restorante, bar & kafene',
    description:
      'Gjej restorante, bar, kafene dhe vende ngrënie në KuTaGjej — orare hapjeje, rezervime dhe çfarë ofrojnë. Posto aktivitetin tënd.',
  },
  professionals: {
    title: 'Profesionistë — freelance & shërbime',
    description:
      'Gjej profesionistë, freelancer dhe shërbime në KuTaGjej. Posto ofertën tënde profesionale.',
  },
};

function findOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | undefined,
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

function formatLocationPhrase(cities: RealEstateCityDto[], cityId?: string, zoneIds?: string[]): string | null {
  if (!cityId) return null;
  const city = cities.find((c) => c.id === cityId);
  if (!city) return null;

  if (zoneIds?.length) {
    const zones = zoneIds
      .map((id) => city.zones.find((z) => z.id === id))
      .filter((zone): zone is NonNullable<typeof zone> => Boolean(zone))
      .map((zone) => ({ name: zone.name, slug: zone.slug }));
    if (zones.length) return formatBrowseLocationPhrase(zones, city.name);
  }

  return formatCityLocationPhrase(city.name);
}

function joinPhrase(parts: string[]): string {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function metaSnippet(text: string, max = 158): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function priceExtras(minPrice?: string, maxPrice?: string): string {
  if (minPrice && maxPrice) return `Çmimi nga ${minPrice} deri ${maxPrice}. `;
  if (minPrice) return `Çmimi nga ${minPrice}. `;
  if (maxPrice) return `Çmimi deri ${maxPrice}. `;
  return '';
}

function buildRealEstateSeo(
  filters: BrowseRealEstateFilters,
  cities: RealEstateCityDto[],
): { title: string; description: string } {
  const cat = filters.cat ? REAL_ESTATE_CAT_SEO[filters.cat] : null;
  const tx = filters.tx ? TX_SEO[filters.tx] : null;
  const location = formatLocationPhrase(cities, filters.city, filters.zone);

  const titleParts: string[] = [cat?.title ?? 'Prona'];
  if (tx) titleParts.push(tx.title);
  let title = joinPhrase(titleParts);
  if (location) title = `${title} ${location}`;

  const subject = cat?.singular ?? 'pronë';
  const txPart = tx ? ` ${tx.singular}` : '';
  const locPart = location ? ` ${location}` : ' në Shqipëri';

  let description = `Njoftime për ${subject}${txPart}${locPart}. Shiko rezultatet dhe gjej pronën që të pëlqen në KuTaGjej.`;
  description = priceExtras(filters.minPrice, filters.maxPrice) + description;
  if (filters.minSurface) description += ` Sipërfaqe min. ${filters.minSurface} m².`;
  if (filters.bedrooms) description += ` Min. ${filters.bedrooms} dhoma gjumi.`;

  return { title, description: metaSnippet(description) };
}

function buildCarsSeo(filters: BrowseCarFilters, cities: RealEstateCityDto[]): { title: string; description: string } {
  const location = formatLocationPhrase(cities, filters.city);
  const fuel = filters.fuel ? (FUEL_SEO[filters.fuel] ?? findOptionLabel(FUEL_TYPE_OPTIONS, filters.fuel)) : null;
  const transmission = findOptionLabel(TRANSMISSION_OPTIONS, filters.transmission);

  const titleParts = ['Makina'];
  if (filters.make && CAR_MAKES.includes(filters.make as (typeof CAR_MAKES)[number])) titleParts.push(filters.make);
  if (fuel) titleParts.push(fuel);
  let title = joinPhrase(titleParts);
  if (location) title = `${title} ${location}`;

  const subjectParts = ['makina'];
  if (filters.make) subjectParts.push(filters.make);
  if (fuel) subjectParts.push(`me ${fuel}`);
  let description = `Njoftime për ${joinPhrase(subjectParts)}${location ? ` ${location}` : ' në Shqipëri'}. Shiko rezultatet dhe gjej makinën që të pëlqen në KuTaGjej.`;
  description = priceExtras(filters.minPrice, filters.maxPrice) + description;
  if (filters.minYear || filters.maxYear) {
    description += ` Viti${filters.minYear ? ` nga ${filters.minYear}` : ''}${filters.maxYear ? ` deri ${filters.maxYear}` : ''}.`;
  }
  if (filters.maxKm) description += ` Deri ${filters.maxKm} km.`;
  if (transmission) description += ` Transmision ${transmission.toLowerCase()}.`;

  return { title, description: metaSnippet(description) };
}

function buildJobsSeo(filters: BrowseJobFilters, cities: RealEstateCityDto[]): { title: string; description: string } {
  const location = formatLocationPhrase(cities, filters.city);
  const industry = findOptionLabel(JOB_INDUSTRY_OPTIONS, filters.industry);
  const jobType = findOptionLabel(JOB_TYPE_OPTIONS, filters.jobType);
  const workLocation = findOptionLabel(WORK_LOCATION_OPTIONS, filters.workLocation);

  const titleParts = ['Punë'];
  if (industry) titleParts.push(`në ${industry}`);
  if (jobType) titleParts.push(jobType.toLowerCase());
  let title = joinPhrase(titleParts);
  if (location) title = `${title} ${location}`;

  const subjectParts = ['vende pune'];
  if (industry) subjectParts.push(`në ${industry}`);
  if (jobType) subjectParts.push(jobType.toLowerCase());
  let description = `Njoftime për ${joinPhrase(subjectParts)}${location ? ` ${location}` : ' në Shqipëri'}. Shiko pozicionet e hapura dhe apliko në KuTaGjej.`;
  if (workLocation) description += ` Lokacioni i punës: ${workLocation}.`;
  const education = findOptionLabel(JOB_EDUCATION_OPTIONS, filters.education);
  if (education) description += ` Arsimi: ${education}.`;
  const experience = findOptionLabel(JOB_EXPERIENCE_OPTIONS, filters.experience);
  if (experience) description += ` Eksperienca: ${experience}.`;

  return { title, description: metaSnippet(description) };
}

function buildMarketplaceSeo(
  filters: BrowseMarketplaceFilters,
  cities: RealEstateCityDto[],
): { title: string; description: string } {
  const location = formatLocationPhrase(cities, filters.city);
  const cat = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, filters.cat);
  const condition = findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, filters.condition);

  const titleParts = [cat ?? 'Artikuj'];
  if (condition) titleParts.push(condition.toLowerCase());
  let title = joinPhrase(titleParts);
  if (location) title = `${title} ${location}`;
  if (!cat && !location) title = 'Tregu online';

  const subject = cat?.toLowerCase() ?? 'artikuj';
  let description = `Njoftime për ${subject}${location ? ` ${location}` : ' në Shqipëri'}. Shiko rezultatet dhe gjej çfarë kërkon në KuTaGjej.`;
  description = priceExtras(filters.minPrice, filters.maxPrice) + description;
  if (condition) description += ` Gjendja: ${condition}.`;

  return { title, description: metaSnippet(description) };
}

function buildDirectorySeo(
  verticalId: 'businesses' | 'professionals',
  filters: BrowseDirectoryFilters,
  cities: RealEstateCityDto[],
): { title: string; description: string } {
  const location = formatLocationPhrase(cities, filters.city);
  const options = verticalId === 'businesses' ? BUSINESS_FILTER_OPTIONS : PROFESSIONAL_FILTER_OPTIONS;
  const type = findOptionLabel(options, filters.type);
  const vertical = findVertical(verticalId);

  const titleParts = [type ?? vertical.label];
  let title = joinPhrase(titleParts);
  if (location) title = `${title} ${location}`;
  if (filters.q) title = `${filters.q} — ${title}`;

  const subject = type?.toLowerCase() ?? vertical.label.toLowerCase();
  let description = `Njoftime për ${subject}${location ? ` ${location}` : ' në Shqipëri'}. Shiko rezultatet dhe gjej atë që kërkon në KuTaGjej.`;
  if (filters.q) description = `Kërkim për «${filters.q}». ${description}`;

  return { title, description: metaSnippet(description) };
}

function buildFilteredSeo(
  verticalId: HomeVerticalId,
  filters: BrowseFilters,
  cities: RealEstateCityDto[],
): { title: string; description: string } {
  switch (verticalId) {
    case 'real-estate':
      return buildRealEstateSeo(filters as BrowseRealEstateFilters, cities);
    case 'cars':
      return buildCarsSeo(filters as BrowseCarFilters, cities);
    case 'jobs':
      return buildJobsSeo(filters as BrowseJobFilters, cities);
    case 'marketplace':
      return buildMarketplaceSeo(filters as BrowseMarketplaceFilters, cities);
    case 'businesses':
    case 'professionals':
      return buildDirectorySeo(verticalId, filters as BrowseDirectoryFilters, cities);
    default:
      return DEFAULT_SEO['real-estate'];
  }
}

function hasSeoBrowseFilters(filters: BrowseFilters): boolean {
  const copy = { ...filters } as Record<string, string | string[] | undefined>;
  delete copy.sort;
  return Object.values(copy).some((value) => {
    if (Array.isArray(value)) return value.some((v) => Boolean(String(v).trim()));
    return Boolean(String(value ?? '').trim());
  });
}

export function buildBrowsePageMetadata({
  verticalId,
  filters,
  cities,
  basePath,
  page = 1,
}: {
  verticalId: HomeVerticalId;
  filters: BrowseFilters;
  cities: RealEstateCityDto[];
  basePath: string;
  page?: number;
}): Metadata {
  const defaults = DEFAULT_SEO[verticalId];
  const hasFilters = hasSeoBrowseFilters(filters);
  const { title, description } = hasFilters ? buildFilteredSeo(verticalId, filters, cities) : defaults;
  const pageTitle = page > 1 ? `${title} — Faqja ${page}` : title;

  const canonicalPath = `${basePath}${buildBrowseUrlQuery(filters, page)}`;
  const canonicalUrl = new URL(canonicalPath.replace(/^\//, ''), config.site.url).toString();
  const fullTitle = `${pageTitle} | ${config.site.name}`;

  return {
    title: pageTitle,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      type: 'website',
      locale: 'sq_AL',
      siteName: config.site.name,
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description,
    },
  };
}

export async function generateBrowseMetadata(
  verticalId: HomeVerticalId,
  searchParams: SearchParamsInput,
  basePath: string,
): Promise<Metadata> {
  const filters = parseBrowseSearchParams(verticalId, searchParams);
  const page = parseBrowsePage(searchParams);
  const cities = await fetchPublicCities();
  return buildBrowsePageMetadata({ verticalId, filters, cities, basePath, page });
}
