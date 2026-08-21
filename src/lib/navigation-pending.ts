'use client';

/**
 * Click-instant navigation pending path.
 *
 * Next.js keeps `usePathname()` on the old route until the destination commits,
 * and `loading.tsx` can lag behind `startTransition`. This store updates in the
 * click handler so chrome + a skeleton can paint immediately.
 */

import { flushSync } from 'react-dom';

import { previewMainTabIndex } from '@/lib/main-tab-pager';
import { paths } from '@/paths';

type Listener = () => void;

let pendingPath: string | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function normalizeNavPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.length > 1 && trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function pathFromHref(href: string, origin = typeof window === 'undefined' ? '' : window.location.origin): string {
  try {
    const url = origin ? new URL(href, origin) : new URL(href, 'http://local.invalid');
    return normalizeNavPath(url.pathname || '/');
  } catch {
    return normalizeNavPath(href.split('?')[0] || '/');
  }
}

export function subscribeNavigationPending(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNavigationPendingPath(): string | null {
  return pendingPath;
}

export function getServerNavigationPendingPath(): string | null {
  return null;
}

function mainTabIndexFromPath(path: string): number | null {
  const p = normalizeNavPath(path);
  if (p === paths.home) return 0;
  if (p === paths.user.savedListings) return 1;
  if (p === paths.user.messages) return 2;
  if (p === paths.user.dashboard) return 3;
  return null;
}

export function beginPendingNavigation(href: string): void {
  const next = pathFromHref(href);
  if (typeof window !== 'undefined' && next === normalizeNavPath(window.location.pathname)) {
    return;
  }
  if (pendingPath === next) return;

  const apply = () => {
    pendingPath = next;
    emit();
  };

  if (typeof window !== 'undefined') {
    const fromIndex = mainTabIndexFromPath(window.location.pathname);
    const toIndex = mainTabIndexFromPath(next);
    if (toIndex != null && fromIndex != null) {
      // Start the pager slide in this turn; skip flushSync so mounting the
      // destination pane does not hitch the first animation frames.
      previewMainTabIndex(toIndex, true);
      apply();
      return;
    }
    // Paint skeleton/active chrome in the same click turn, before the route transition.
    flushSync(apply);
    return;
  }
  apply();
}

export function clearPendingNavigation(): void {
  if (pendingPath == null) return;
  pendingPath = null;
  emit();
}

export function clearPendingNavigationIfMatches(pathname: string | null): void {
  if (!pendingPath || !pathname) return;
  if (normalizeNavPath(pathname) === pendingPath) {
    pendingPath = null;
    emit();
  }
}
