/**
 * Client navigation helpers.
 *
 * Prefers Next.js App Router soft navigation (keeps layouts/providers mounted)
 * once `SoftNavigateBridge` registers the router. Falls back to a full document
 * load only before that bridge mounts.
 */

import { runActiveTabRefresh } from '@/lib/tab-refresh';

type NavigateFn = (href: string) => void;
type RefreshFn = () => void;

let softNavigateFn: NavigateFn | null = null;
let softRefreshFn: RefreshFn | null = null;

export function registerAppRouterNavigation(navigate: NavigateFn, refresh: RefreshFn): void {
  softNavigateFn = navigate;
  softRefreshFn = refresh;
}

export function unregisterAppRouterNavigation(): void {
  softNavigateFn = null;
  softRefreshFn = null;
}

/** Soft-navigate when possible; otherwise full document assign. */
export function hardNavigate(href: string, event?: { preventDefault(): void }): void {
  event?.preventDefault();
  if (typeof window === 'undefined') return;

  if (softNavigateFn) {
    softNavigateFn(href);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return;
  }

  window.location.assign(href);
}

/** Scroll to top and refresh RSC data without a full document reload. */
export function hardRefreshToTop(event?: { preventDefault(): void }): void {
  event?.preventDefault();
  if (typeof window === 'undefined') return;
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  void runActiveTabRefresh();
  if (softRefreshFn) {
    softRefreshFn();
    return;
  }
  window.location.reload();
}
