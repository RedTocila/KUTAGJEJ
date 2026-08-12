import { paths } from '@/paths';
import type { User } from '@/types/user';

/** Where to send someone after sign-in or when they hit a guest-only page while logged in. */
export function getDefaultAuthenticatedPath(user: Pick<User, 'accountType' | 'role'>): string {
  const at = user.accountType;
  const isPortal =
    at === 'individual' ||
    at === 'business' ||
    user.role === 'business-user' ||
    user.role === 'individual-user';

  if (isPortal) return paths.user.dashboard;
  if (at === 'admin' || at === 'managed') return paths.dashboard.overview;
  if (user.role === 'admin') return paths.dashboard.overview;
  return paths.dashboard.overview;
}

/** Sign-out landing page: portal users → `/user/auth`, staff/admin → admin sign-in. */
export function getPostSignOutPath(
  user: Pick<User, 'accountType' | 'role'> | null | undefined,
  pathnameHint?: string,
): string {
  const at = user?.accountType;
  const role = user?.role;
  if (at === 'individual' || at === 'business' || role === 'business-user' || role === 'individual-user') {
    return paths.user.auth;
  }
  if (at === 'admin' || at === 'managed' || role === 'admin') {
    return paths.auth.signIn;
  }
  if (pathnameHint?.startsWith('/user')) {
    return paths.user.auth;
  }
  return paths.auth.signIn;
}
