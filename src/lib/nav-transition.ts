/**
 * Direction-aware route transitions (View Transitions API).
 *
 * Push: `onRouterTransitionStart` (see `src/instrumentation-client.ts`) runs inside Next's
 * navigation transition, so `addTransitionType` tags that exact navigation and the
 * `RouteTransitionTrigger` boundary lets React start the view transition.
 *
 * Back / Forward: React renders popstate transitions synchronously, which never animate.
 * `installPopStateViewTransition` holds the popstate, starts the view transition itself,
 * and replays the event inside the update callback so Next restores the page under it.
 *
 * `html[data-kg-nav]` tells `global.css` which direction to play.
 */
import { addTransitionType } from 'react';

import { MAIN_TABS_MOBILE_MQ, mainTabFromPath } from '@/lib/main-tabs';
import { normalizeNavPath, pathFromHref } from '@/lib/navigation-pending';

export const NAV_TRANSITION_TYPES = {
  forward: 'kg-forward',
  settle: 'kg-settle',
} as const;

type NavTransitionDirection = 'forward' | 'back' | 'settle';

export const PENDING_OVERLAY_ATTR = 'data-nav-pending-overlay';

type RouterNavigationType = 'push' | 'replace' | 'traverse';

/** Longest we freeze the old frame waiting for a Back/Forward commit (uncached routes). */
const TRAVERSE_COMMIT_TIMEOUT_MS = 450;

let committedPath: string | null = null;
let committedEntryIndex: number | null = null;
let traverseWaiter: { path: string; resolve: () => void } | null = null;
let replayingPopState = false;
let popStateInstalled = false;

function navigationEntryIndex(): number | null {
  const { navigation } = window as Window & { navigation?: { currentEntry?: { index: number } | null } };
  const index = navigation?.currentEntry?.index;
  return typeof index === 'number' && index >= 0 ? index : null;
}

/** Called from the route layout effect (after scroll restore) once a pathname commits. */
export function setCommittedNavPath(pathname: string | null): void {
  if (!pathname) return;
  committedPath = normalizeNavPath(pathname);
  committedEntryIndex = navigationEntryIndex();
  if (traverseWaiter?.path === committedPath) traverseWaiter.resolve();
}

function currentPath(): string {
  return committedPath ?? normalizeNavPath(window.location.pathname);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

function isPagerSwap(from: string, to: string): boolean {
  return Boolean(
    mainTabFromPath(from) && mainTabFromPath(to) && window.matchMedia(MAIN_TABS_MOBILE_MQ).matches,
  );
}

function resolvePushDirection(href: string): NavTransitionDirection | null {
  const to = pathFromHref(href);
  const from = currentPath();
  if (to === from) return null;
  // The mobile tab pager already slides between Home / Saves / Search / Messages / Profile.
  if (isPagerSwap(from, to)) return null;
  // Tab-bar destinations switch in place, like native tabs — no push.
  if (mainTabFromPath(to)) return 'settle';
  // Destination skeleton is already on screen — crossfade it into the real page.
  if (document.querySelector(`[${PENDING_OVERLAY_ATTR}]`)) return 'settle';
  return 'forward';
}

export function onNavTransitionStart(href: string, navigationType: RouterNavigationType): void {
  if (typeof window === 'undefined' || !supportsViewTransitions()) return;
  // Traversals are animated by the popstate interceptor below.
  if (navigationType === 'traverse') return;
  const root = document.documentElement;
  const direction =
    navigationType === 'replace' || prefersReducedMotion() ? null : resolvePushDirection(href);
  if (!direction || direction === 'back') {
    delete root.dataset.kgNav;
    return;
  }
  root.dataset.kgNav = direction;
  addTransitionType(NAV_TRANSITION_TYPES[direction]);
}

function handlePopState(event: PopStateEvent): void {
  if (replayingPopState || prefersReducedMotion()) return;
  // Safari / Chrome swipe-back already animated the page.
  if ((event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) return;

  const to = normalizeNavPath(window.location.pathname);
  const from = currentPath();
  if (to === from || isPagerSwap(from, to)) return;

  const index = navigationEntryIndex();
  const direction: NavTransitionDirection =
    index != null && committedEntryIndex != null && index > committedEntryIndex ? 'forward' : 'back';
  const { state } = event;

  event.stopImmediatePropagation();
  document.documentElement.dataset.kgNav = direction;
  document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        const done = () => {
          window.clearTimeout(timer);
          if (traverseWaiter?.resolve === done) traverseWaiter = null;
          resolve();
        };
        const timer = window.setTimeout(done, TRAVERSE_COMMIT_TIMEOUT_MS);
        traverseWaiter = { path: to, resolve: done };
        replayingPopState = true;
        try {
          window.dispatchEvent(new PopStateEvent('popstate', { state }));
        } finally {
          replayingPopState = false;
        }
      }),
  );
}

/** Must run before Next's router registers its popstate listener. */
export function installPopStateViewTransition(): void {
  if (popStateInstalled || typeof window === 'undefined' || !supportsViewTransitions()) return;
  popStateInstalled = true;
  window.addEventListener('popstate', handlePopState, true);
}
