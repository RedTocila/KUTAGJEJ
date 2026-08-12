'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { paths } from '@/paths';
import { hasStoredAccessToken, readAuthItem, AUTH_USER_KEY } from '@/lib/auth/storage';

/**
 * Auth provider - handles route protection
 * Redirects to login if user is not authenticated on dashboard routes
 */
export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === paths.auth.signIn || pathname === paths.user.auth) {
      return;
    }

    if (pathname.startsWith('/dashboard')) {
      const token = hasStoredAccessToken();
      const userData = readAuthItem(AUTH_USER_KEY);

      if (!token || !userData) {
        router.replace(paths.auth.signIn);
      }
    }

    if (pathname.startsWith('/user/dashboard')) {
      const token = hasStoredAccessToken();
      const userData = readAuthItem(AUTH_USER_KEY);

      if (!token || !userData) {
        router.replace(paths.user.auth);
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
