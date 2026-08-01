import type { NavItemConfig } from '@/types/nav';
import type { AccountType } from '@/types/user';
import { paths } from '@/paths';

export const navItems = [
  {
    key: 'overview',
    title: 'Përmbledhje',
    href: paths.dashboard.overview,
    icon: 'chart-pie',
  },
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
  {
    key: 'categories',
    title: 'Kategoritë',
    href: paths.dashboard.kategorite,
    icon: 'squares-four',
    platformAdminOnly: true,
  },
  {
    key: 'real-estate-locations',
    title: 'Vendndodhjet (pasuri)',
    href: paths.dashboard.realEstateLocations,
    icon: 'map-pin',
    platformAdminOnly: true,
  },
  {
    key: 'contracts',
    title: 'Kontratat',
    href: paths.dashboard.kontratat,
    icon: 'scroll',
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
    title: 'Paketat e krediteve',
    href: paths.dashboard.creditPackages,
    icon: 'coins',
    platformAdminOnly: true,
  },
  {
    key: 'job-employer-verification',
    title: 'Verifikimet (Punë)',
    href: paths.dashboard.jobEmployerVerification,
    icon: 'shield-check',
    platformAdminOnly: true,
  },
  {
    key: 'professional-verification',
    title: 'Verifikimet (Prof.)',
    href: paths.dashboard.professionalVerification,
    icon: 'shield-check',
    platformAdminOnly: true,
  },
  {
    key: 'referral',
    title: 'Referimi',
    href: paths.dashboard.referral,
    icon: 'handshake',
  },
  {
    key: 'referral-tracking',
    title: 'Gjurmimi referimesh',
    href: paths.dashboard.referralTracking,
    icon: 'users',
    platformAdminOnly: true,
  },
  {
    key: 'profile',
    title: 'Profili im',
    href: paths.dashboard.profile,
    icon: 'user-gear',
  },
] satisfies NavItemConfig[];

/** Platform admin = Admin collection (`accountType`) or legacy JWT without `accountType` but `role === 'admin'`. */
export function getDashboardNavItemsForAccount(
  accountType?: AccountType,
  legacyAdminRole?: boolean,
): NavItemConfig[] {
  const isPlatformAdmin = accountType === 'admin' || Boolean(!accountType && legacyAdminRole);
  return navItems.filter((item) => {
    if (item.platformAdminOnly && !isPlatformAdmin) return false;
    return true;
  });
}
