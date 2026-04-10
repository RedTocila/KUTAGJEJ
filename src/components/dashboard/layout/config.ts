import type { NavItemConfig } from '@/types/nav';
import { paths } from '@/paths';

export const navItems = [
  {
    key: 'overview',
    title: 'Përmbledhje',
    href: paths.dashboard.overview,
    icon: 'chart-pie',
  },
  {
    key: 'profile',
    title: 'Profili im',
    href: paths.dashboard.profile,
    icon: 'user-gear',
  },
] satisfies NavItemConfig[];
