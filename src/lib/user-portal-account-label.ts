import type { User } from '@/types/user';

/** Display label for the account type the user registered with. */
export function getUserPortalAccountCategoryLabel(user: Pick<User, 'accountType' | 'role'> | null | undefined): string {
  if (!user) return 'Llogari';
  if (user.accountType === 'business' || user.role === 'business-user') return 'User Business';
  if (user.accountType === 'individual' || user.role === 'individual-user') return 'Individual User';
  return 'Llogari';
}
