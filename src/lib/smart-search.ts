import { HOME_VERTICALS, type HomeVerticalId } from '@/lib/home-categories';
import { CAR_MAKES, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS } from '@/lib/car-constants';
import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import {
  buildBrowseUrlQuery,
  BUSINESS_FILTER_OPTIONS,
  PROFESSIONAL_FILTER_OPTIONS,
  type BrowseCarFilters,
  type BrowseDirectoryFilters,
  type BrowseFilters,
  type BrowseJobFilters,
  type BrowseMarketplaceFilters,
  type BrowseRealEstateFilters,
} from '@/lib/listing-filters';
import { REAL_ESTATE_PROPERTY_CATEGORIES, TRANSACTION_OPTIONS } from '@/lib/real-estate-constants';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

export interface SmartSearchResult {
  verticalId: HomeVerticalId;
  href: string;
  filters: BrowseFilters;
  /** Human-readable hints for what was detected (debug / optional UI). */
  matched: string[];
}

type VerticalScores = Record<HomeVerticalId, number>;

type FilterBag = {
  'real-estate': BrowseRealEstateFilters;
  cars: BrowseCarFilters;
  jobs: BrowseJobFilters;
  marketplace: BrowseMarketplaceFilters;
  businesses: BrowseDirectoryFilters;
  professionals: BrowseDirectoryFilters;
};

const DEFAULT_VERTICAL: HomeVerticalId = 'real-estate';

function emptyBag(): FilterBag {
  return {
    'real-estate': {},
    cars: {},
    jobs: {},
    marketplace: {},
    businesses: {},
    professionals: {},
  };
}

function emptyScores(): VerticalScores {
  return {
    'real-estate': 0,
    cars: 0,
    jobs: 0,
    marketplace: 0,
    businesses: 0,
    professionals: 0,
  };
}

/** Lowercase, strip accents — keeps Albanian letters comparable. */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .replace(/[^\p{L}\p{N}\s./-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function padText(text: string): string {
  return ` ${text} `;
}

function consumePhrase(remaining: string, phrase: string): string | null {
  const normalizedPhrase = normalizeSearchText(phrase);
  if (!normalizedPhrase) return null;

  const padded = padText(remaining);
  const target = padText(normalizedPhrase);

  if (padded.includes(target)) {
    const re = new RegExp(`(^|\\s)${escapeRegex(normalizedPhrase)}(\\s|$)`, 'i');
    if (re.test(remaining)) {
      return remaining.replace(re, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  return null;
}

function boost(scores: VerticalScores, vertical: HomeVerticalId, amount: number) {
  scores[vertical] += amount;
}

type PhraseRule = {
  phrases: string[];
  vertical: HomeVerticalId;
  weight: number;
  apply: (bag: FilterBag) => void;
};

function addRule(
  rules: PhraseRule[],
  phrases: string[],
  vertical: HomeVerticalId,
  weight: number,
  apply: (bag: FilterBag) => void,
) {
  rules.push({ phrases, vertical, weight, apply });
}

function addOptionRules(
  rules: PhraseRule[],
  vertical: HomeVerticalId,
  options: ReadonlyArray<{ value: string; label: string }>,
  field: string,
  weight = 3,
  extra?: Record<string, string[]>,
) {
  for (const option of options) {
    const phrases = [option.label, option.value, ...(extra?.[option.value] ?? [])];
    addRule(rules, phrases, vertical, weight, (bag) => {
      (bag[vertical] as Record<string, string>)[field] = option.value;
    });
  }
}

function buildRules(): PhraseRule[] {
  const rules: PhraseRule[] = [];

  addRule(
    rules,
    ['prona', 'prone', 'pasuri', 'apartament', 'apartamente', 'banesa', 'vila', 'shtepi', 'shtepia', 'zyre', 'dyqan', 'toka', 'toke', 'garazh', 'parking', 'qira', 'me qera', 'me qira'],
    'real-estate',
    4,
    () => {},
  );

  addRule(
    rules,
    ['makina', 'makine', 'auto', 'automobil', 'motor', 'benzine', 'diesel', 'elektrik', 'hybrid'],
    'cars',
    4,
    () => {},
  );

  addRule(
    rules,
    ['pune', 'vend pune', 'punesim', 'karriere', 'stazh', 'praktike', 'internship', 'full time', 'part time'],
    'jobs',
    4,
    () => {},
  );

  addRule(
    rules,
    ['tregu', 'blerje', 'shes', 'laptop', 'telefon', 'iphone', 'mobilje', 'veshje', 'lodra', 'elektronike', 'artikull'],
    'marketplace',
    4,
    () => {},
  );

  addRule(
    rules,
    ['biznes', 'restorant', 'restaurant', 'bar', 'kafe', 'kafene', 'pastice', 'pasticeri', 'brunch', 'piceri', 'fast food'],
    'businesses',
    4,
    () => {},
  );

  addRule(
    rules,
    ['profesionist', 'profesioniste', 'freelance', 'konsulent', 'konsulence', 'mjek', 'avokat', 'dizajn', 'trajnim', 'kurse'],
    'professionals',
    4,
    () => {},
  );

  addOptionRules(rules, 'real-estate', REAL_ESTATE_PROPERTY_CATEGORIES.map((c) => ({ value: c.slug, label: c.label })), 'cat', 5, {
    apartment: ['apartament', 'apartamente', 'banesa'],
    villa: ['vila', 'shtepi', 'shtepia'],
    'penthouse-duplex': ['penthouse', 'duplex'],
    'room-studio-attic': ['studio', 'dhoma', 'garsoniere', 'attic'],
    parking: ['garazh', 'parking'],
    shop: ['dyqan'],
    office: ['zyre'],
    'building-plot': ['toke ndertimi', 'parcela', 'ndertim'],
    'agricultural-land': ['toke bujqesore', 'bujqesi'],
    'commercial-local': ['bar restorant', 'lokal'],
  });

  addOptionRules(rules, 'real-estate', TRANSACTION_OPTIONS, 'tx', 4, {
    rent: ['qira', 'me qera', 'me qira', 'per qira'],
    sale: ['shitje', 'shitet', 'me shitje', 'blerje'],
  });

  for (const make of CAR_MAKES) {
    const aliases: string[] = [make];
    if (make === 'Mercedes-Benz') aliases.push('mercedes', 'merc', 'benz');
    if (make === 'Volkswagen') aliases.push('vw');
    if (make === 'BMW') aliases.push('bmw');
    addRule(rules, aliases, 'cars', 6, (bag) => {
      bag.cars.make = make;
    });
  }

  addOptionRules(rules, 'cars', FUEL_TYPE_OPTIONS, 'fuel', 4, {
    petrol: ['benzine', 'benzin', 'gasoline'],
    diesel: ['diesel'],
    electric: ['elektrik', 'elektrike'],
    'hybrid-petrol': ['hybrid', 'hibrid'],
    'plugin-hybrid': ['plug in', 'plugin'],
  });

  addOptionRules(rules, 'cars', TRANSMISSION_OPTIONS, 'transmission', 3, {
    automatic: ['automatik', 'automatike'],
    manual: ['manual', 'manuale'],
  });

  addOptionRules(rules, 'jobs', JOB_INDUSTRY_OPTIONS, 'industry', 4, {
    'teknologji-informacioni': ['it', 'teknologji', 'programim', 'software'],
    'marketing-produkte': ['marketing'],
    horeka: ['hoteleri', 'restorant', 'kafe'],
    finance: ['finance', 'financa'],
    'mjekesore-shendetesore': ['mjekesi', 'mjekesore', 'spital'],
  });

  addOptionRules(rules, 'jobs', JOB_TYPE_OPTIONS, 'jobType', 4, {
    'full-time': ['full time', 'kohe te plote'],
    'part-time': ['part time', 'kohe te pjesshme'],
    remote: ['remote', 'nga shtepia', 'nga shtepi'],
    internship: ['stazh', 'praktike', 'internship'],
    freelance: ['freelance'],
  });

  addOptionRules(rules, 'jobs', WORK_LOCATION_OPTIONS, 'workLocation', 3, {
    remote: ['remote', 'nga shtepia', 'nga shtepi'],
    hybrid: ['hybrid', 'hibrid'],
    onsite: ['zyre', 'ne zyre', 'onsite'],
  });

  addOptionRules(rules, 'jobs', JOB_EDUCATION_OPTIONS, 'education', 2);
  addOptionRules(rules, 'jobs', JOB_EXPERIENCE_OPTIONS, 'experience', 2);

  addOptionRules(rules, 'marketplace', MARKETPLACE_CATEGORY_OPTIONS, 'cat', 5, {
    elektronike: ['laptop', 'telefon', 'iphone', 'tablet', 'kompjuter'],
    'mobilje-shtepi': ['mobilje', 'shtepi'],
    'veshje-aksesore': ['veshje', 'aksesore'],
    lodra: ['lodra', 'lojera'],
    'sport-hobi': ['sport', 'hobi'],
  });

  addOptionRules(rules, 'marketplace', MARKETPLACE_CONDITION_OPTIONS, 'condition', 2, {
    'i-ri': ['i ri', 'e re', 'new'],
    'si-i-ri': ['si i ri'],
  });

  addOptionRules(rules, 'businesses', BUSINESS_FILTER_OPTIONS, 'type', 5);
  addOptionRules(rules, 'professionals', PROFESSIONAL_FILTER_OPTIONS, 'type', 5);

  return rules.sort((a, b) => {
    const maxA = Math.max(...a.phrases.map((p) => normalizeSearchText(p).length));
    const maxB = Math.max(...b.phrases.map((p) => normalizeSearchText(p).length));
    return maxB - maxA;
  });
}

const PHRASE_RULES = buildRules();

function extractNumericPatterns(text: string, bag: FilterBag, scores: VerticalScores) {
  let remaining = text;

  const surface = remaining.match(/\b(\d{1,4})\s*(m2|m²|metra katror|metra)\b/i);
  if (surface) {
    bag['real-estate'].minSurface = surface[1];
    boost(scores, 'real-estate', 3);
    remaining = remaining.replace(surface[0], ' ');
  }

  const bedrooms = remaining.match(/\b(\d{1,2})\s*(dhoma|dhomë|bedroom|bedrooms)\b/i);
  if (bedrooms) {
    bag['real-estate'].bedrooms = bedrooms[1];
    boost(scores, 'real-estate', 3);
    remaining = remaining.replace(bedrooms[0], ' ');
  }

  const maxKm = remaining.match(/\b(?:max|deri|≤|<=)\s*(\d{1,3}(?:\s?\d{3})*)\s*km\b/i);
  if (maxKm) {
    bag.cars.maxKm = maxKm[1].replace(/\s/g, '');
    boost(scores, 'cars', 3);
    remaining = remaining.replace(maxKm[0], ' ');
  }

  const maxPrice = remaining.match(/\b(?:max|deri|≤|<=)\s*(\d{1,3}(?:\s?\d{3})*)\s*(?:€|eur|euro|lek)?\b/i);
  if (maxPrice) {
    const value = maxPrice[1].replace(/\s/g, '');
    bag['real-estate'].maxPrice = value;
    bag.cars.maxPrice = value;
    bag.marketplace.maxPrice = value;
    boost(scores, 'real-estate', 1);
    boost(scores, 'cars', 1);
    boost(scores, 'marketplace', 1);
    remaining = remaining.replace(maxPrice[0], ' ');
  }

  const minPrice = remaining.match(/\b(?:min|nga|≥|>=)\s*(\d{1,3}(?:\s?\d{3})*)\s*(?:€|eur|euro|lek)?\b/i);
  if (minPrice) {
    const value = minPrice[1].replace(/\s/g, '');
    bag['real-estate'].minPrice = value;
    bag.cars.minPrice = value;
    bag.marketplace.minPrice = value;
    boost(scores, 'real-estate', 1);
    boost(scores, 'cars', 1);
    boost(scores, 'marketplace', 1);
    remaining = remaining.replace(minPrice[0], ' ');
  }

  const yearRange = remaining.match(/\b(?:nga|from)\s*(19\d{2}|20\d{2})\b/i);
  if (yearRange) {
    bag.cars.minYear = yearRange[1];
    boost(scores, 'cars', 3);
    remaining = remaining.replace(yearRange[0], ' ');
  }

  const yearMax = remaining.match(/\b(?:deri|to|until)\s*(19\d{2}|20\d{2})\b/i);
  if (yearMax) {
    bag.cars.maxYear = yearMax[1];
    boost(scores, 'cars', 3);
    remaining = remaining.replace(yearMax[0], ' ');
  }

  const loneYear = remaining.match(/\b(19[89]\d|20[0-2]\d)\b/);
  if (loneYear) {
    bag.cars.minYear = loneYear[1];
    bag.cars.maxYear = loneYear[1];
    boost(scores, 'cars', 2);
    remaining = remaining.replace(loneYear[0], ' ');
  }

  return remaining.replace(/\s+/g, ' ').trim();
}

function matchCities(
  text: string,
  cities: RealEstateCityDto[],
): { remaining: string; cityId?: string; zoneIds?: string[]; label?: string } {
  let remaining = text;
  let best: { cityId: string; zoneIds?: string[]; label: string; len: number } | null = null;

  for (const city of cities) {
    const cityNorm = normalizeSearchText(city.name);
    const next = consumePhrase(remaining, cityNorm);
    if (next && cityNorm.length > (best?.len ?? 0)) {
      best = { cityId: city.id, label: city.name, len: cityNorm.length };
      remaining = next;
    }

    for (const zone of city.zones ?? []) {
      const zoneNorm = normalizeSearchText(zone.name);
      const zoneNext = consumePhrase(remaining, zoneNorm);
      if (zoneNext && zoneNorm.length > (best?.len ?? 0)) {
        best = { cityId: city.id, zoneIds: [zone.id], label: `${zone.name}, ${city.name}`, len: zoneNorm.length };
        remaining = zoneNext;
      }
    }
  }

  if (!best) return { remaining };
  return {
    remaining,
    cityId: best.cityId,
    zoneIds: best.zoneIds,
    label: best.label,
  };
}

function pickVertical(scores: VerticalScores): HomeVerticalId {
  let best: HomeVerticalId = DEFAULT_VERTICAL;
  let bestScore = -1;
  for (const vertical of HOME_VERTICALS) {
    const score = scores[vertical.id];
    if (score > bestScore) {
      bestScore = score;
      best = vertical.id;
    }
  }
  return best;
}

function pruneFilters<T extends Record<string, unknown>>(filters: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value == null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    out[key] = value;
  }
  return out as T;
}

export function parseSmartSearchQuery(
  rawQuery: string,
  cities: RealEstateCityDto[] = [],
): SmartSearchResult {
  const matched: string[] = [];
  const normalized = normalizeSearchText(rawQuery);
  if (!normalized) {
    const vertical = HOME_VERTICALS.find((v) => v.id === DEFAULT_VERTICAL)!;
    return { verticalId: DEFAULT_VERTICAL, href: vertical.href, filters: {}, matched };
  }

  const scores = emptyScores();
  const bag = emptyBag();
  let remaining = extractNumericPatterns(normalized, bag, scores);

  const cityMatch = matchCities(remaining, cities);
  remaining = cityMatch.remaining;
  if (cityMatch.cityId) {
    for (const vertical of HOME_VERTICALS) {
      const filters = bag[vertical.id] as Record<string, unknown>;
      filters.city = cityMatch.cityId;
      if (cityMatch.zoneIds?.length && vertical.id === 'real-estate') {
        filters.zone = cityMatch.zoneIds;
      }
    }
    boost(scores, 'real-estate', 2);
    boost(scores, 'cars', 2);
    boost(scores, 'jobs', 2);
    boost(scores, 'marketplace', 2);
    boost(scores, 'businesses', 2);
    boost(scores, 'professionals', 2);
    if (cityMatch.label) matched.push(cityMatch.label);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of PHRASE_RULES) {
      for (const phrase of rule.phrases) {
        const next = consumePhrase(remaining, phrase);
        if (!next) continue;
        remaining = next;
        rule.apply(bag);
        boost(scores, rule.vertical, rule.weight);
        matched.push(phrase);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  const verticalId = pickVertical(scores);
  const vertical = HOME_VERTICALS.find((v) => v.id === verticalId)!;
  const filters = pruneFilters({ ...bag[verticalId] });

  const leftover = remaining.trim();
  if (leftover.length >= 2) {
    filters.q = leftover;
    matched.push(leftover);
  }

  return {
    verticalId,
    href: vertical.href,
    filters,
    matched,
  };
}

export function buildSmartSearchUrl(result: SmartSearchResult): string {
  return `${result.href}${buildBrowseUrlQuery(result.filters)}`;
}
