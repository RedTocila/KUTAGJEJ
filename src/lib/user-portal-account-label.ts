import type { User } from '@/types/user';
import type { ListingCategoryKey } from '@/types/listing-category';

/** True for registered business portal accounts. */
export function isBusinessPortalAccount(user: Pick<User, 'accountType' | 'role'> | null | undefined): boolean {
  return Boolean(user && (user.accountType === 'business' || user.role === 'business-user'));
}

/** Whether this portal user may create listings in a given category. */
export function canPostListingCategory(
  user: Pick<User, 'accountType' | 'role'> | null | undefined,
  key: ListingCategoryKey | string,
): boolean {
  if (key === 'businesses') return isBusinessPortalAccount(user);
  return Boolean(
    user &&
      (user.accountType === 'individual' ||
        user.accountType === 'business' ||
        user.role === 'business-user'),
  );
}

/** Display label for the account type the user registered with. */
export function getUserPortalAccountCategoryLabel(user: Pick<User, 'accountType' | 'role'> | null | undefined): string {
  if (!user) return 'Llogari';
  if (isBusinessPortalAccount(user)) return 'User Business';
  if (user.accountType === 'individual' || user.role === 'individual-user') return 'Individual User';
  return 'Llogari';
}
