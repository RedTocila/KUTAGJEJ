'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import {
  registerAppRouterNavigation,
  unregisterAppRouterNavigation,
} from '@/lib/hard-navigate';

/**
 * Registers App Router `push` / `refresh` for imperative helpers in `hard-navigate.ts`.
 * Keeps in-app clicks instant (no full document reload).
 */
export function SoftNavigateBridge({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  React.useEffect(() => {
    registerAppRouterNavigation(
      (href) => {
        React.startTransition(() => {
          router.push(href);
        });
      },
      () => {
        React.startTransition(() => {
          router.refresh();
        });
      },
    );
    return () => {
      unregisterAppRouterNavigation();
    };
  }, [router]);

  return children;
}
