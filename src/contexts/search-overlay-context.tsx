'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { SearchOverlay } from '@/components/public/search-overlay';
import { paths } from '@/paths';

const SEARCH_OVERLAY_HISTORY_KEY = 'kutagjejSearchOverlay';

export type CloseSearchOptions = {
  /** Skip the slide-down (leaving to another route). */
  immediate?: boolean;
  /** Drop the overlay history entry so the next `router.replace` can take its place. */
  replaceHistory?: boolean;
};

type SearchOverlayContextValue = {
  open: boolean;
  openSearch: () => void;
  closeSearch: (options?: CloseSearchOptions) => void;
};

const SearchOverlayContext = React.createContext<SearchOverlayContextValue | null>(null);

function isSearchPagePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === paths.public.search || pathname.startsWith(`${paths.public.search}/`);
}

function hasOverlayHistoryState(): boolean {
  if (typeof window === 'undefined') return false;
  const state = window.history.state as Record<string, unknown> | null;
  return Boolean(state && state[SEARCH_OVERLAY_HISTORY_KEY]);
}

function pushOverlayHistory(): void {
  if (typeof window === 'undefined' || hasOverlayHistoryState()) return;
  const prev = (window.history.state as Record<string, unknown> | null) ?? {};
  window.history.pushState({ ...prev, [SEARCH_OVERLAY_HISTORY_KEY]: true }, '');
}

function stripOverlayHistory(): void {
  if (typeof window === 'undefined' || !hasOverlayHistoryState()) return;
  const prev = { ...((window.history.state as Record<string, unknown> | null) ?? {}) };
  delete prev[SEARCH_OVERLAY_HISTORY_KEY];
  window.history.replaceState(prev, '');
}

export function SearchOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [immediateClose, setImmediateClose] = React.useState(false);
  const pathWhenOpenedRef = React.useRef<string | null>(null);

  const closeSearch = React.useCallback((options?: CloseSearchOptions) => {
    setImmediateClose(Boolean(options?.immediate));
    setOpen(false);

    if (options?.replaceHistory) {
      stripOverlayHistory();
      return;
    }

    if (hasOverlayHistoryState()) {
      window.history.back();
    }
  }, []);

  const openSearch = React.useCallback(() => {
    if (open || isSearchPagePath(pathname)) return;
    pathWhenOpenedRef.current = pathname;
    setImmediateClose(false);
    pushOverlayHistory();
    setOpen(true);
  }, [open, pathname]);

  React.useEffect(() => {
    const onPopState = () => {
      if (!hasOverlayHistoryState()) {
        setImmediateClose(false);
        setOpen(false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    if (isSearchPagePath(pathname)) {
      closeSearch({ immediate: true, replaceHistory: true });
      return;
    }
    if (pathWhenOpenedRef.current && pathname !== pathWhenOpenedRef.current) {
      closeSearch({ immediate: true, replaceHistory: true });
    }
  }, [pathname, open, closeSearch]);

  const value = React.useMemo(
    () => ({ open, openSearch, closeSearch }),
    [open, openSearch, closeSearch],
  );

  return (
    <SearchOverlayContext.Provider value={value}>
      {children}
      <SearchOverlay
        open={open}
        immediateClose={immediateClose}
        onClose={closeSearch}
      />
    </SearchOverlayContext.Provider>
  );
}

export function useSearchOverlay(): SearchOverlayContextValue {
  const ctx = React.useContext(SearchOverlayContext);
  if (!ctx) {
    throw new Error('useSearchOverlay must be used within SearchOverlayProvider');
  }
  return ctx;
}

/** Optional: returns null outside the provider. */
export function useOptionalSearchOverlay(): SearchOverlayContextValue | null {
  return React.useContext(SearchOverlayContext);
}
