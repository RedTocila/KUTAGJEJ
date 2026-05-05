/**
 * Single source of truth describing the four marketplace verticals shown on
 * the homepage (category tiles, latest-ads sections, hero search). Keeping
 * this in one place keeps the homepage, header dropdowns and footer in sync.
 */

import { paths } from '@/paths';

export type HomeVerticalId = 'real-estate' | 'cars' | 'jobs' | 'marketplace';

export interface HomeVertical {
  id: HomeVerticalId;
  /** Albanian label shown in the UI. */
  label: string;
  /** Short, SEO-friendly tagline. */
  tagline: string;
  /** Two-stop gradient used on the category tile. */
  gradient: readonly [string, string];
  /** Phosphor icon name (resolved via dynamic import in components). */
  iconKey: 'buildings' | 'car' | 'briefcase' | 'storefront';
  /** Public listings page. */
  href: string;
  /** Direct "post a listing" path inside the user dashboard. */
  postHref: string;
  /** Albanian search-bar placeholder copy. */
  searchPlaceholder: string;
}

export const HOME_VERTICALS: readonly HomeVertical[] = [
  {
    id: 'real-estate',
    label: 'Pasuri të paluajtshme',
    tagline: 'Apartamente, vila, ambiente biznesi dhe toka',
    gradient: ['#76ba1b', '#3a8c00'] as const,
    iconKey: 'buildings',
    href: paths.public.realEstate,
    postHref: '/user/dashboard/pasuri-te-paluajtshme',
    searchPlaceholder: 'Kërko apartament, qytet, zonë…',
  },
  {
    id: 'cars',
    label: 'Automjete',
    tagline: 'Makina, motora, mjete pune dhe pjesë',
    gradient: ['#2563EB', '#1E3A8A'] as const,
    iconKey: 'car',
    href: paths.public.cars,
    postHref: '/user/dashboard/automjete',
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
] as const;

export function findVertical(id: HomeVerticalId): HomeVertical {
  const v = HOME_VERTICALS.find((x) => x.id === id);
  if (!v) throw new Error(`Unknown vertical id: ${id}`);
  return v;
}
