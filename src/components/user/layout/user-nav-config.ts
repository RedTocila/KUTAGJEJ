import { paths } from '@/paths';
import type { NavItemConfig } from '@/types/nav';

export const USER_PORTAL_NAV_ITEMS = [
  {
    key: 'overview',
    title: 'Përmbledhje',
    href: paths.user.dashboard,
    icon: 'squares-four',
    matcher: { type: 'equals', href: paths.user.dashboard } as const,
  },
  {
    key: 'profile',
    title: 'Profili im',
    href: paths.user.profile,
    icon: 'user-gear',
    matcher: { type: 'startsWith', href: paths.user.profile } as const,
  },
] satisfies NavItemConfig[];
