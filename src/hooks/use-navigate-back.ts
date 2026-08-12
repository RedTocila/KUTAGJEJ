'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import {
  HISTORY_BACK_ATTR,
  canPageNavigateBack,
  isModifiedClick,
  navigatePageBack,
} from '@/lib/navigate-back';
import { paths } from '@/paths';

/** Imperative back: skip in-page filter/tag history, otherwise go to `fallbackHref`. */
export function useNavigateBack(fallbackHref = paths.home) {
  const router = useRouter();
  return React.useCallback(() => {
    navigatePageBack(router, fallbackHref);
  }, [router, fallbackHref]);
}

/**
 * Props for a Next/MUI link that prefers `router.back()`.
 * Fallback `href` is used on cold landings and modified clicks (new tab).
 */
export function useHistoryBackProps(fallbackHref: string) {
  const router = useRouter();
  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented) return;
      if (isModifiedClick(event)) return;
      if (!canPageNavigateBack()) return;
      event.preventDefault();
      navigatePageBack(router, fallbackHref);
    },
    [router, fallbackHref],
  );

  return {
    href: fallbackHref,
    onClick,
    [HISTORY_BACK_ATTR]: '' as const,
  };
}
