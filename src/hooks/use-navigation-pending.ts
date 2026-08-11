'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import {
  getNavigationPendingPath,
  getServerNavigationPendingPath,
  subscribeNavigationPending,
} from '@/lib/navigation-pending';

/** Destination path from the moment of click until the route commits. */
export function useNavigationPendingPath(): string | null {
  return React.useSyncExternalStore(
    subscribeNavigationPending,
    getNavigationPendingPath,
    getServerNavigationPendingPath,
  );
}

/** Pathname to use for active nav chrome — pending destination wins over the stale route. */
export function useDisplayPathname(): string {
  const pathname = usePathname() ?? '';
  const pendingPath = useNavigationPendingPath();
  return pendingPath ?? pathname;
}
