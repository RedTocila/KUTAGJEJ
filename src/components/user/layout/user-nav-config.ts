import { paths } from '@/paths';
import type { NavItemConfig } from '@/types/nav';
import type { User } from '@/types/user';

export const USER_PORTAL_NAV_ITEMS = [
  {
    key: 'overview',
    title: 'Përmbledhje',
    href: paths.user.dashboard,
    icon: 'squares-four',
    matcher: { type: 'equals', href: paths.user.dashboard } as const,
  },
  {
    key: 'real-estate',
    title: 'Posto njoftim',
    href: paths.user.realEstateListing,
    icon: 'buildings',
    matcher: { type: 'startsWith', href: paths.user.realEstateListing } as const,
  },
  {
    key: 'my-listings',
    title: 'Njoftimet e mia',
    href: paths.user.myRealEstateListings,
    icon: 'list-bullets',
    matcher: { type: 'equals', href: paths.user.myRealEstateListings } as const,
  },
  {
    key: 'saved-listings',
    title: 'Të ruajturat',
    href: paths.user.savedListings,
    icon: 'bookmark',
    matcher: { type: 'equals', href: paths.user.savedListings } as const,
  },
  {
    key: 'messages',
    title: 'Mesazhet',
    href: paths.user.messages,
    icon: 'chats-circle',
    matcher: { type: 'equals', href: paths.user.messages } as const,
  },
  {
    key: 'referral',
    title: 'Referimi',
    href: paths.user.referral,
    icon: 'handshake',
    matcher: { type: 'equals', href: paths.user.referral } as const,
  },
  {
    key: 'profile',
    title: 'Profili im',
    href: paths.user.profile,
    icon: 'user-gear',
    matcher: { type: 'startsWith', href: paths.user.profile } as const,
  },
] satisfies NavItemConfig[];

/** Hides real-estate listing nav for accounts that cannot publish (e.g. managed staff). */
export function getUserPortalNavItemsForUser(user: User | null | undefined): NavItemConfig[] {
  const canRealEstate =
    user != null &&
    (user.accountType === 'individual' ||
      user.accountType === 'business' ||
      user.role === 'business-user');
  return USER_PORTAL_NAV_ITEMS.filter((item) => {
    if (item.key === 'real-estate' || item.key === 'my-listings' || item.key === 'saved-listings' || item.key === 'messages' || item.key === 'referral') return canRealEstate;
    return true;
  });
}
