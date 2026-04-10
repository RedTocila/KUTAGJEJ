'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { paths } from '@/paths';

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
    // Skip auth check for login pages
    if (pathname === paths.auth.signIn) {
      return;
    }

    // Check auth for dashboard routes
    if (pathname.startsWith('/dashboard')) {
      const token = localStorage.getItem('custom-auth-token');
      const userData = localStorage.getItem('user-data');

      if (!token || !userData) {
        router.replace(paths.auth.signIn);
      }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
