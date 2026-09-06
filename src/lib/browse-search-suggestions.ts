import type { HomeVerticalId } from '@/lib/home-categories';
import {
  ALL_VEHICLE_MAKES,
  FUEL_TYPE_OPTIONS,
  TRANSMISSION_OPTIONS,
  VEHICLE_TYPES,
} from '@/lib/car-constants';
import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import {
  BUSINESS_FILTER_OPTIONS,
  PROFESSIONAL_FILTER_OPTIONS,
} from '@/lib/listing-filters';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { REAL_ESTATE_PROPERTY_CATEGORIES, TRANSACTION_OPTIONS } from '@/lib/real-estate-constants';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { normalizeSearchText } from '@/lib/smart-search';
import { DEFAULT_LANGUAGE, localizedLabel, type AppLanguage } from '@/lib/language';

export type BrowseSuggestionGroup = 'zone' | 'city' | 'filter' | 'keyword';

export interface BrowseSearchSuggestion {
  id: string;
  /** Text committed on select / Enter (fed to applyBrowseSearchToken). */
  token: string;
  label: string;
  description?: string;
  group: BrowseSuggestionGroup;
}

type CatalogItem = {
  token: string;
  label: string;
  description?: string;
  group: Exclude<BrowseSuggestionGroup, 'keyword'>;
  /** Extra needles for matching (aliases, slug, value). */
  needles?: string[];
};

function optionItems(
  options: ReadonlyArray<{ value: string; label: string; labelEn?: string }>,
  language: AppLanguage,
  group: 'filter' = 'filter',
): CatalogItem[] {
  return options.map((option) => {
    const label = localizedLabel(language, option.label, option.labelEn ?? option.label);
    return {
      token: option.label,
      label,
      group,
      needles: [option.value, option.label, option.labelEn ?? ''].filter(Boolean),
    };
  });
}

function catalogForVertical(
  verticalId: HomeVerticalId,
  cities: RealEstateCityDto[],
  language: AppLanguage,
): CatalogItem[] {
  const items: CatalogItem[] = [];

  for (const city of cities) {
    items.push({
      token: city.name,
      label: city.name,
      group: 'city',
      needles: [city.name, city.slug],
    });
    if (verticalId !== 'real-estate') continue;
    for (const zone of city.zones ?? []) {
      items.push({
        token: zone.name,
        label: zone.name,
        description: city.name,
        group: 'zone',
        needles: [zone.name, zone.slug, city.name],
      });
    }
  }

  switch (verticalId) {
    case 'real-estate':
      items.push(
        ...REAL_ESTATE_PROPERTY_CATEGORIES.map((c) => ({
          token: c.label,
          label: localizedLabel(language, c.label, c.labelEn),
          group: 'filter' as const,
          needles: [c.slug, c.label, c.labelEn],
        })),
        ...optionItems([...TRANSACTION_OPTIONS], language),
      );
      break;
    case 'cars':
      items.push(
        ...VEHICLE_TYPES.map((t) => ({
          token: t.label,
          label: t.label,
          group: 'filter' as const,
          needles: [t.value, t.label],
        })),
        ...ALL_VEHICLE_MAKES.map((make) => ({
          token: make,
          label: make,
          group: 'filter' as const,
          needles: [make],
        })),
        ...optionItems([...FUEL_TYPE_OPTIONS], language),
        ...optionItems([...TRANSMISSION_OPTIONS], language),
      );
      break;
    case 'jobs':
      items.push(
        ...optionItems([...JOB_INDUSTRY_OPTIONS], language),
        ...optionItems([...JOB_TYPE_OPTIONS], language),
        ...optionItems([...WORK_LOCATION_OPTIONS], language),
        ...optionItems([...JOB_EDUCATION_OPTIONS], language),
        ...optionItems([...JOB_EXPERIENCE_OPTIONS], language),
      );
      break;
    case 'marketplace':
      items.push(
        ...optionItems([...MARKETPLACE_CATEGORY_OPTIONS], language),
        ...optionItems([...MARKETPLACE_CONDITION_OPTIONS], language),
      );
      break;
    case 'businesses':
      items.push(...optionItems([...BUSINESS_FILTER_OPTIONS], language));
      break;
    case 'professionals':
      items.push(...optionItems([...PROFESSIONAL_FILTER_OPTIONS], language));
      break;
    default:
      break;
  }

  return items;
}

function scoreMatch(needle: string, item: CatalogItem): number {
  if (!needle) return 0;
  const primary = [item.label, item.description ?? '']
    .map((v) => normalizeSearchText(v))
    .filter(Boolean);
  const secondary =
    needle.length >= 3
      ? (item.needles ?? []).map((v) => normalizeSearchText(v)).filter(Boolean)
      : [];
  const haystacks = [...primary, ...secondary];
  let best = 0;
  const allowIncludes = needle.length >= 3;
  for (const hay of haystacks) {
    if (hay === needle) best = Math.max(best, 100);
    else if (hay.startsWith(needle)) best = Math.max(best, 80 - Math.min(hay.length - needle.length, 20));
    else if (allowIncludes && hay.includes(needle)) {
      best = Math.max(best, 50 - Math.min(hay.indexOf(needle), 20));
    }
  }
  return best;
}

const GROUP_RANK: Record<BrowseSuggestionGroup, number> = {
  zone: 0,
  city: 1,
  filter: 2,
  keyword: 3,
};

/**
 * Typeahead alternatives for browse keyword search (cities, zones, category filters).
 * Always includes a free-text keyword row when the query is long enough.
 */
export function listBrowseSearchSuggestions(options: {
  verticalId: HomeVerticalId;
  query: string;
  cities?: RealEstateCityDto[];
  language?: AppLanguage;
  limit?: number;
  keywordLabel?: (q: string) => string;
}): BrowseSearchSuggestion[] {
  const {
    verticalId,
    query,
    cities = [],
    language = DEFAULT_LANGUAGE,
    limit = 8,
    keywordLabel = (q) => q,
  } = options;

  const trimmed = query.trim();
  const needle = normalizeSearchText(trimmed);
  const out: BrowseSearchSuggestion[] = [];
  const seen = new Set<string>();

  if (needle.length >= 1) {
    const scored = catalogForVertical(verticalId, cities, language)
      .map((item) => ({ item, score: scoreMatch(needle, item) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const groupDiff = GROUP_RANK[a.item.group] - GROUP_RANK[b.item.group];
        if (groupDiff !== 0) return groupDiff;
        return a.item.label.localeCompare(b.item.label);
      });

    for (const { item } of scored) {
      const key = `${item.group}:${normalizeSearchText(item.token)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: key,
        token: item.token,
        label: item.label,
        description: item.description,
        group: item.group,
      });
      if (out.length >= limit) break;
    }
  }

  if (trimmed.length >= 2) {
    const key = `keyword:${normalizeSearchText(trimmed)}`;
    if (!seen.has(key)) {
      out.push({
        id: key,
        token: trimmed,
        label: keywordLabel(trimmed),
        group: 'keyword',
      });
    }
  }

  return out.slice(0, limit + 1);
}
