import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import type { ListingCategoryKey } from '@/types/listing-category';

export const TAB_ORDER: ListingCategoryKey[] = [
  'real-estate',
  'job-listings',
  'cars',
  'marketplace',
  'businesses',
  'professionals',
];

export const CATEGORY_HELP: Record<ListingCategoryKey, string> = {
  'real-estate':
    '«Lloji i parë» që përdoruesi zgjedh për një shpallje pasurie (p.sh. Apartament, Vila, Penthouse). Slug-i përdoret në URL.',
  'job-listings':
    'Llojet e njoftimeve të punës (p.sh. Full-time, Praktikë). Slug-i përdoret në URL.',
  cars: 'Llojet e makinave (p.sh. Vetura, SUV). Slug-i përdoret në URL.',
  marketplace: 'Seksionet e tregut (p.sh. Elektronikë, Mobilje). Slug-i përdoret në URL.',
  businesses:
    'Llojet e vendeve (p.sh. Restorant, Bar, Kafene, Brunch). Slug-i përdoret në URL — nuk janë shpallje pasurie.',
  professionals:
    'Llojet e ofertave profesionale / freelance (p.sh. konsulence, shërbime). Slug-i përdoret në URL.',
};

export const CATEGORY_VISUAL: Record<
  ListingCategoryKey,
  { Icon: typeof BuildingsIcon; accent: 'primary' | 'info' | 'warning' | 'success' }
> = {
  'real-estate': { Icon: BuildingsIcon, accent: 'primary' },
  'job-listings': { Icon: BriefcaseIcon, accent: 'info' },
  cars: { Icon: CarIcon, accent: 'warning' },
  marketplace: { Icon: StorefrontIcon, accent: 'success' },
  businesses: { Icon: BuildingOfficeIcon, accent: 'info' },
  professionals: { Icon: UsersIcon, accent: 'primary' },
};
