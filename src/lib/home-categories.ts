/**
 * Single source of truth describing the marketplace verticals shown on
 * the homepage (category tiles, latest-ads sections, hero search). Keeping
 * this in one place keeps the homepage, header dropdowns and footer in sync.
 *
 * Display labels/taglines/placeholders are localized via `getMessages(language).verticals`
 * — use `localizeHomeVerticals` / `localizeSearchCategories` in client UI.
 */

import { getMessages } from '@/lib/i18n/messages';
import type { AppLanguage } from '@/lib/language';
import { california } from '@/styles/theme/colors';
import { paths } from '@/paths';

export type HomeVerticalId =
  | 'real-estate'
  | 'cars'
  | 'jobs'
  | 'marketplace'
  | 'businesses'
  | 'professionals';

/** Search tabs include AI (ChatGPT-style) plus listing verticals. */
export type SearchCategoryId = 'ai' | HomeVerticalId;

export interface HomeVertical {
  id: HomeVerticalId;
  /** Default (sq) label — prefer localized copy in client UI. */
  label: string;
  /** Default (sq) tagline — prefer localized copy in client UI. */
  tagline: string;
  /** Two-stop gradient used on the category tile. */
  gradient: readonly [string, string];
  /** Phosphor icon name (resolved in `HomeVerticalIcon`). */
  iconKey: 'buildings' | 'car-profile' | 'briefcase' | 'storefront' | 'fork-knife' | 'handshake';
  /** Public listings page. */
  href: string;
  /** Direct "post a listing" path inside the user dashboard. */
  postHref: string;
  /** Default (sq) search placeholder — prefer localized copy in client UI. */
  searchPlaceholder: string;
}

export interface SearchCategory {
  id: SearchCategoryId;
  label: string;
  tagline: string;
  gradient: readonly [string, string];
  iconKey: HomeVertical['iconKey'] | 'sparkle';
  href: string;
  /** Listing verticals have a post path; AI search does not. */
  postHref?: string;
  searchPlaceholder: string;
}

export const HOME_VERTICALS: readonly HomeVertical[] = [
  {
    id: 'real-estate',
    label: 'Prona',
    tagline: 'Apartamente, vila, ambiente biznesi dhe toka',
    gradient: ['#76ba1b', '#3a8c00'] as const,
    iconKey: 'buildings',
    href: paths.public.realEstate,
    postHref: '/user/dashboard/prona',
    searchPlaceholder: 'Kërko apartament, qytet, zonë…',
  },
  {
    id: 'cars',
    label: 'Makina',
    tagline: 'Makina, motora, mjete pune dhe pjesë',
    gradient: ['#2563EB', '#1E3A8A'] as const,
    iconKey: 'car-profile',
    href: paths.public.cars,
    postHref: '/user/dashboard/makina',
    searchPlaceholder: 'Kërko marka, model, vit…',
  },
  {
    id: 'jobs',
    label: 'Punë',
    tagline: 'Vende të lira, full-time, part-time dhe remote',
    gradient: ['#EA580C', '#9A3412'] as const,
    iconKey: 'briefcase',
    href: paths.public.jobs,
    postHref: '/user/dashboard/pune',
    searchPlaceholder: 'Kërko pozicion, industri, qytet…',
  },
  {
    id: 'marketplace',
    label: 'Tregu',
    tagline: 'Elektronikë, mobilje, veshje, lodra dhe shumë më tepër',
    gradient: ['#7C3AED', '#4C1D95'] as const,
    iconKey: 'storefront',
    href: paths.public.marketplace,
    postHref: '/user/dashboard/tregu',
    searchPlaceholder: 'Kërko çfarëdo që ke në mendje…',
  },
  {
    id: 'businesses',
    label: 'Biznese',
    tagline: 'Restorante, bar, kafene — orare, rezervime dhe shërbime',
    gradient: ['#0ea5e9', '#0369a1'] as const,
    iconKey: 'fork-knife',
    href: paths.public.businesses,
    postHref: '/user/dashboard/biznese',
    searchPlaceholder: 'Kërko restorant, bar, qytet…',
  },
  {
    id: 'professionals',
    label: 'Profesionistë',
    tagline: 'Freelance, konsulence dhe shërbime profesionale',
    gradient: ['#14b8a6', '#0f766e'] as const,
    iconKey: 'handshake',
    href: paths.public.professionals,
    postHref: '/user/dashboard/profesioniste',
    searchPlaceholder: 'Kërko profesion, shërbim, qytet…',
  },
] as const;

/** Star / warning amber — same as rating stars (`warning.main`). */
export const AI_SEARCH_BLUE = california[400];
export const AI_SEARCH_BLUE_HOVER = california[500];
export const AI_SEARCH_BLUE_SOFT = 'rgba(255, 187, 31, 0.28)';
export const AI_SEARCH_BLUE_MUTED = 'rgba(255, 187, 31, 0.16)';
/** Text color on solid AI amber buttons. */
export const AI_SEARCH_BLUE_ON = '#000000';

/** AI search tab — always first in hero / search category lists. */
export const AI_SEARCH_CATEGORY: SearchCategory = {
  id: 'ai',
  label: 'AI Search',
  tagline: 'Pyet si ChatGPT — gjej njoftime me gjuhë natyrore',
  gradient: [california[300], california[400]] as const,
  iconKey: 'sparkle',
  href: `${paths.public.search}?cat=ai`,
  searchPlaceholder: 'P.sh. apartament me qira në Tiranë deri 500€…',
};

/** Hero search tabs + /kerko categories: AI first, then listing verticals. */
export const SEARCH_CATEGORIES: readonly SearchCategory[] = [
  AI_SEARCH_CATEGORY,
  ...HOME_VERTICALS,
];

export function isHomeVerticalId(value: string | null | undefined): value is HomeVerticalId {
  return Boolean(value && HOME_VERTICALS.some((v) => v.id === value));
}

export function isSearchCategoryId(value: string | null | undefined): value is SearchCategoryId {
  return value === 'ai' || isHomeVerticalId(value);
}

export function findVertical(id: HomeVerticalId): HomeVertical {
  const v = HOME_VERTICALS.find((x) => x.id === id);
  if (!v) throw new Error(`Unknown vertical id: ${id}`);
  return v;
}

export function findSearchCategory(id: SearchCategoryId): SearchCategory {
  const cat = SEARCH_CATEGORIES.find((x) => x.id === id);
  if (!cat) throw new Error(`Unknown search category id: ${id}`);
  return cat;
}

/** Returns verticals with labels/taglines/placeholders for the active language. */
export function localizeHomeVerticals(language: AppLanguage): HomeVertical[] {
  const copy = getMessages(language).verticals;
  return HOME_VERTICALS.map((v) => ({
    ...v,
    label: copy[v.id].label,
    tagline: copy[v.id].tagline,
    searchPlaceholder: copy[v.id].searchPlaceholder,
  }));
}

export function localizeVertical(id: HomeVerticalId, language: AppLanguage): HomeVertical {
  const base = findVertical(id);
  const copy = getMessages(language).verticals[id];
  return {
    ...base,
    label: copy.label,
    tagline: copy.tagline,
    searchPlaceholder: copy.searchPlaceholder,
  };
}

export function localizeSearchCategories(language: AppLanguage): SearchCategory[] {
  const copy = getMessages(language).verticals;
  return SEARCH_CATEGORIES.map((cat) => ({
    ...cat,
    label: copy[cat.id].label,
    tagline: copy[cat.id].tagline,
    searchPlaceholder: copy[cat.id].searchPlaceholder,
  }));
}

export function localizeSearchCategory(id: SearchCategoryId, language: AppLanguage): SearchCategory {
  const base = findSearchCategory(id);
  const copy = getMessages(language).verticals[id];
  return {
    ...base,
    label: copy.label,
    tagline: copy.tagline,
    searchPlaceholder: copy.searchPlaceholder,
  };
}
