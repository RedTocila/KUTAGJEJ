/** Marks in-app back links so the pending-nav overlay does not treat the fallback href as the destination. */
export const HISTORY_BACK_ATTR = 'data-history-back';

const FIRST_PAGE_KEY = 'kutagjej:first-page';

type NavigationLike = {
  currentEntry?: { index: number } | null;
};

function pageKey(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function getNavigationIndex(): number | null {
  if (typeof window === 'undefined') return null;
  const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
  const index = navigation?.currentEntry?.index;
  return typeof index === 'number' ? index : null;
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

export function isModifiedClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}
