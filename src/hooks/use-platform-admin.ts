'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

export function useIsPlatformAdmin(): boolean {
  const { user } = useUser();
  return user?.accountType === 'admin' || Boolean(user?.role === 'admin' && user?.accountType === undefined);
}

/** Redirects non-admins to dashboard overview; returns whether the current user may access admin-only pages. */
export function usePlatformAdminGuard(): { user: ReturnType<typeof useUser>['user']; isPlatformAdmin: boolean } {
  const router = useRouter();
  const { user } = useUser();
  const isPlatformAdmin = useIsPlatformAdmin();

  React.useEffect(() => {
    if (!user) return;
    if (!isPlatformAdmin) {
      router.replace(paths.dashboard.overview);
    }
  }, [user, isPlatformAdmin, router]);

  return { user, isPlatformAdmin };
}
