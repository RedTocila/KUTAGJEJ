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
      router.replace(paths.auth.signIn);
      return;
    }

    const isAdminRoute = pathname.startsWith('/dashboard');
    const isBusinessRoute = pathname.startsWith('/app');

    if (isAdminRoute && user.role !== 'admin') {
      router.replace('/app');
      return;
    }
    if (isBusinessRoute && user.role === 'admin') {
      router.replace('/dashboard');
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
