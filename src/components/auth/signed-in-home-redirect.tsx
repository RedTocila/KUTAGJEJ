'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { getDefaultAuthenticatedPath } from '@/lib/auth/post-login-path';
import { AUTH_USER_KEY, hasStoredAccessToken, readAuthItem } from '@/lib/auth/storage';
import { isColdSessionStart } from '@/lib/navigate-back';
import { paths } from '@/paths';
import type { User } from '@/types/user';

let pendingDashboardRedirect = false;

export function isPendingHomeDashboardRedirect(): boolean {
  return pendingDashboardRedirect;
}

function cachedDashboardPath(): string | null {
  if (typeof window === 'undefined') return null;
  if (!hasStoredAccessToken()) return null;
  try {
    const raw = readAuthItem(AUTH_USER_KEY);
    if (raw) return getDefaultAuthenticatedPath(JSON.parse(raw) as User);
  } catch {
    /* ignore corrupt cache */
  }
  return paths.user.dashboard;
}

/**
 * Cold-open of `/` while signed in always lands on the user/admin dashboard.
 * In-app Home taps still show the public homepage (session already started).
 */
export function SignedInHomeRedirect(): null {
  const pathname = usePathname();

  React.useLayoutEffect(() => {
    if (pathname !== paths.home) return;
    if (!isColdSessionStart()) return;
    const dest = cachedDashboardPath();
    if (!dest) return;
    pendingDashboardRedirect = true;
    window.location.replace(dest);
  }, [pathname]);

  return null;
}
