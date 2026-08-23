import type { NavItemConfig, NavSectionConfig } from '@/types/nav';
import type { AccountType } from '@/types/user';
import { paths } from '@/paths';

export const navSections = [
  {
    key: 'panel',
    title: null,
    items: [
      {
        key: 'overview',
        title: 'Përmbledhje',
        href: paths.dashboard.overview,
        icon: 'chart-pie',
        matcher: { type: 'equals', href: paths.dashboard.overview },
      },
      {
        key: 'admin-ai',
        title: 'Asistent AI',
        href: paths.dashboard.ai,
        icon: 'sparkle',
        platformAdminOnly: true,
      },
    ],
  },
  {
    key: 'content',
    title: 'Përmbajtja',
    items: [
      {
        key: 'listing-moderation',
        title: 'Njoftimet',
        href: paths.dashboard.listingModeration,
        icon: 'megaphone',
        platformAdminOnly: true,
      },
      {
        key: 'home-banners',
        title: 'Bannerat',
        href: paths.dashboard.homeBanners,
        icon: 'image',
        platformAdminOnly: true,
      },
      {
        key: 'categories',
        title: 'Kategoritë',
        href: paths.dashboard.kategorite,
        icon: 'squares-four',
        platformAdminOnly: true,
      },
      {
        key: 'real-estate-locations',
        title: 'Vendndodhjet',
        href: paths.dashboard.realEstateLocations,
        icon: 'map-pin',
        platformAdminOnly: true,
      },
      {
        key: 'account-verification',
        title: 'Verifikimi',
        href: paths.dashboard.accountVerification,
        icon: 'shield-check',
        platformAdminOnly: true,
      },
    ],
  },
  {
    key: 'team',
    title: 'Ekipi',
    items: [
      {
        key: 'staff-users',
        title: 'Përdoruesit',
        href: paths.dashboard.staffUsers,
        icon: 'users',
        platformAdminOnly: true,
      },
      {
        key: 'roles',
        title: 'Rolet',
        href: paths.dashboard.roles,
        icon: 'shield',
        platformAdminOnly: true,
      },
    ],
  },
  {
    key: 'finance',
    title: 'Financa',
    items: [
      {
        key: 'contracts',
        title: 'Paketat',
        href: paths.dashboard.kontratat,
        icon: 'package',
        platformAdminOnly: true,
      },
      {
        key: 'payments',
        title: 'Pagesat',
        href: paths.dashboard.payments,
        icon: 'credit-card',
        platformAdminOnly: true,
      },
      {
        key: 'credit-packages',
        title: 'Boost Coins',
        href: paths.dashboard.creditPackages,
        icon: 'coins',
        platformAdminOnly: true,
      },
      {
        key: 'ai-prices',
        title: 'Çmimet AI',
        href: paths.dashboard.aiPrices,
        icon: 'sparkle',
        platformAdminOnly: true,
      },
    ],
  },
  {
    key: 'growth',
    title: 'Rritja',
    items: [
      {
        key: 'referral',
        title: 'Referimi',
        href: paths.dashboard.referral,
        icon: 'handshake',
      },
      {
        key: 'referral-tracking',
        title: 'Gjurmimi',
        href: paths.dashboard.referralTracking,
        icon: 'chart-line',
        platformAdminOnly: true,
      },
    ],
  },
  {
    key: 'account',
    title: 'Llogaria',
    items: [
      {
        key: 'profile',
        title: 'Profili im',
        href: paths.dashboard.profile,
        icon: 'user-gear',
      },
    ],
  },
] as const satisfies readonly NavSectionConfig[];

function flattenNavItems(items: NavItemConfig[]): NavItemConfig[] {
  return items.flatMap((item) => [item, ...(item.subItems ? flattenNavItems(item.subItems) : [])]);
}

/** Flat list (legacy / search). */
export const navItems: NavItemConfig[] = flattenNavItems(
  (navSections as readonly NavSectionConfig[]).flatMap((section) => section.items),
);

function isPlatformAdminAccount(accountType?: AccountType, legacyAdminRole?: boolean): boolean {
  return accountType === 'admin' || Boolean(!accountType && legacyAdminRole);
}

function filterItems(items: NavItemConfig[], isPlatformAdmin: boolean): NavItemConfig[] {
  return items
    .map((item) => ({
      ...item,
      subItems: item.subItems ? filterItems(item.subItems, isPlatformAdmin) : undefined,
    }))
    .filter((item) => {
      if (item.platformAdminOnly && !isPlatformAdmin) return false;
      return true;
    });
}

/** Platform admin = Admin collection (`accountType`) or legacy JWT without `accountType` but `role === 'admin'`. */
export function getDashboardNavItemsForAccount(
  accountType?: AccountType,
  legacyAdminRole?: boolean,
): NavItemConfig[] {
  return filterItems(navItems, isPlatformAdminAccount(accountType, legacyAdminRole));
}

export function getDashboardNavSectionsForAccount(
  accountType?: AccountType,
  legacyAdminRole?: boolean,
): NavSectionConfig[] {
  const isPlatformAdmin = isPlatformAdminAccount(accountType, legacyAdminRole);
  return navSections
    .map((section) => ({
      ...section,
      items: filterItems(section.items, isPlatformAdmin),
    }))
    .filter((section) => section.items.length > 0);
}
