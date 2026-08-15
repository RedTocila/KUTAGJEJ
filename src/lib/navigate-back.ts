/** Marks in-app back links so the pending-nav overlay does not treat the fallback href as the destination. */
export const HISTORY_BACK_ATTR = 'data-history-back';

const FIRST_PAGE_KEY = 'kutagjej:first-page';

type NavigationEntryLike = {
  url?: string;
  index?: number;
};

type NavigationLike = {
  currentEntry?: NavigationEntryLike | null;
  entries?: () => NavigationEntryLike[];
};

function pageKey(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function pathnameFromUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return '';
  }
}

function getNavigationIndex(): number | null {
  if (typeof window === 'undefined') return null;
  const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
  const index = navigation?.currentEntry?.index;
  return typeof index === 'number' ? index : null;
}

/** True when this tab has not recorded a first in-app page yet (cold open). */
export function isColdSessionStart(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !sessionStorage.getItem(FIRST_PAGE_KEY);
  } catch {
    return false;
  }
}

/** Record the first page of this tab so later back controls can tell in-app history from a cold landing. */
export function rememberFirstPageIfNeeded(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!sessionStorage.getItem(FIRST_PAGE_KEY)) {
      sessionStorage.setItem(FIRST_PAGE_KEY, pageKey());
    }
  } catch {
    // Private mode / storage blocked.
  }
}

/**
 * True when this tab has a previous in-app history entry we can pop.
 * Prefers the Navigation API index (does not include the referring site).
 */
export function canNavigateBack(): boolean {
  if (typeof window === 'undefined') return false;
  const navIndex = getNavigationIndex();
  if (navIndex != null) return navIndex > 0;
  try {
    const first = sessionStorage.getItem(FIRST_PAGE_KEY);
    if (!first) return false;
    return first !== pageKey();
  } catch {
    return false;
  }
}

/**
 * How many history steps back to reach the previous entry with a different pathname.
 * Skips filter/tag/pagination changes that only update query params on the same route.
 */
export function getPageBackDelta(): number | null {
  if (typeof window === 'undefined') return null;
  const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
  const current = navigation?.currentEntry;
  const entries = navigation?.entries?.();
  const currentIndex = current?.index;
  if (entries == null || currentIndex == null || currentIndex <= 0) return null;

  const currentPathname = pathnameFromUrl(current?.url ?? window.location.href);
  for (let i = currentIndex - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry?.url) continue;
    if (pathnameFromUrl(entry.url) !== currentPathname) {
      return currentIndex - i;
    }
  }
  return null;
}

/** True when we can pop to a previous route (not just a query-param tweak on the same page). */
export function canPageNavigateBack(): boolean {
  const delta = getPageBackDelta();
  if (delta != null && delta > 0) return true;
  if (getNavigationIndex() != null) return false;
  return canNavigateBack();
}

type AppRouterLike = {
  back: () => void;
  push: (href: string) => void;
};

/**
 * Go back to the previous page, skipping in-page filter/tag/pagination history.
 * Falls back to `fallbackHref` on cold landings or when only same-route history exists.
 */
export function navigatePageBack(router: AppRouterLike, fallbackHref: string): void {
  const delta = getPageBackDelta();
  if (delta != null && delta > 0) {
    window.history.go(-delta);
    return;
  }

  // Navigation API is available but every prior entry shares this pathname — use fallback.
  if (getNavigationIndex() != null) {
    router.push(fallbackHref);
    return;
  }

  if (canNavigateBack()) {
    router.back();
    return;
  }
  router.push(fallbackHref);
}

export function isModifiedClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}
