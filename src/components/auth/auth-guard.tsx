'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Alert, Box, CircularProgress } from '@mui/material';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, error, isLoading } = useUser();
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    if (isLoading) return;
    if (error) {
      setIsChecking(false);
      return;
    }
    if (!user) {
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
  }, [user, error, isLoading, pathname, router]);

  if (error) {
    return <Alert color="error">{error}</Alert>;
  }

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      {children}
      {isChecking ? (
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
          <CircularProgress />
        </Box>
      ) : null}
    </Box>
  );
}
