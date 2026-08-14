'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Alert, Box } from '@mui/material';
import { FullPageSkeleton } from '@/components/core/content-skeletons';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';
import { hasStoredAccessToken } from '@/lib/auth/storage';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, error, isLoading, checkSession } = useUser();
  const [isChecking, setIsChecking] = React.useState(() => !user);
  /** When a session token exists, never blank the screen — soft-nav stays interactive. */
  const [hasCachedAuth, setHasCachedAuth] = React.useState(false);
  const sessionRetryDone = React.useRef(false);

  React.useLayoutEffect(() => {
    setHasCachedAuth(hasStoredAccessToken());
  }, []);

  React.useEffect(() => {
    if (isLoading) return;
    if (error) {
      setIsChecking(false);
      return;
    }
    if (!user) {
      const hasToken = typeof window !== 'undefined' && hasStoredAccessToken();
      if (hasToken) {
        setHasCachedAuth(true);
      }
      if (hasToken && !sessionRetryDone.current) {
        sessionRetryDone.current = true;
        void checkSession();
        return;
      }
      // Token still present after retry (e.g. API blip) — keep waiting; do not bounce to login.
      if (hasToken) {
        setIsChecking(false);
        return;
      }
      router.replace(pathname.startsWith('/user') ? paths.user.auth : paths.auth.signIn);
      return;
    }

    const isAdminRoute = pathname.startsWith('/dashboard');
    const isUserPortalRoute = pathname.startsWith('/user/dashboard');
    const isLegacyAppRoute = pathname.startsWith('/app');

    const dashboardAccess =
      user.accountType === 'admin' ||
      user.accountType === 'managed' ||
      (!user.accountType && user.role === 'admin');

    const userPortalAccess =
      user.accountType === 'individual' ||
      user.accountType === 'business' ||
      user.role === 'business-user' ||
      user.role === 'individual-user';

    if (isAdminRoute && !dashboardAccess && userPortalAccess) {
      router.replace(paths.user.dashboard);
      return;
    }
    if (isAdminRoute && !dashboardAccess && !userPortalAccess) {
      router.replace(paths.user.auth);
      return;
    }

    if (isUserPortalRoute && dashboardAccess) {
      router.replace(paths.dashboard.overview);
      return;
    }
    if (isUserPortalRoute && !userPortalAccess) {
      router.replace(paths.auth.signIn);
      return;
    }

    if (isLegacyAppRoute && dashboardAccess) {
      router.replace(paths.dashboard.overview);
      return;
    }
    if (isLegacyAppRoute && userPortalAccess) {
      router.replace(paths.user.dashboard);
      return;
    }

    setIsChecking(false);
  }, [user, error, isLoading, pathname, router, checkSession]);

  if (error) {
    return <Alert color="error">{error}</Alert>;
  }

  const showBlocker = isChecking && !user && !hasCachedAuth;

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      {children}
      {showBlocker ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal + 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <FullPageSkeleton />
        </Box>
      ) : null}
    </Box>
  );
}
