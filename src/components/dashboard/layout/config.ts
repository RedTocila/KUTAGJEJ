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
