'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@mui/material';

import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';

export interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Guest guard component
 * Redirects authenticated users away from guest-only pages (like login)
 */
export function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();
  const { user, error, isLoading } = useUser();
  const [isChecking, setIsChecking] = React.useState<boolean>(true);

  const checkPermissions = React.useCallback(async (): Promise<void> => {
    if (isLoading) {
      return;
    }

    if (error) {
      setIsChecking(false);
      return;
    }

    if (user) {
      router.replace(paths.dashboard.overview);
      return;
    }

    setIsChecking(false);
  }, [error, isLoading, router, user]);

  React.useEffect(() => {
    void checkPermissions();
  }, [checkPermissions]);

  if (isChecking) {
    return null;
  }

  if (error) {
    return <Alert color="error">{error}</Alert>;
  }

  return <React.Fragment>{children}</React.Fragment>;
}
