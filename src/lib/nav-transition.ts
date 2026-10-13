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
/** Runs synchronously inside the popstate handler, before the old frame is snapshotted. */
let beforeTraverseCapture: (() => void) | null = null;

/**
 * Edge-swipe back keeps a live transform until the popstate snapshot.
 * Clearing it here (same turn as `startViewTransition`) avoids a paint of the unshifted page.
 */
export function runBeforeNextTraverseCapture(fn: () => void): void {
  beforeTraverseCapture = fn;
}

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

function takeTraverseCaptureHook(): void {
  const hook = beforeTraverseCapture;
  beforeTraverseCapture = null;
  hook?.();
}

/** Matches `--motion-ease-ios` in global.css. */
const EDGE_COMMIT_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

type EdgeCommitMotion = {
  from: string;
  under: string;
  dim: number;
  duration: number;
};

function clearEdgeCommitStyles(): void {
  const root = document.documentElement;
  delete root.dataset.kgEdgeCommit;
  root.style.removeProperty('--kg-edge-from');
  root.style.removeProperty('--kg-edge-under');
  root.style.removeProperty('--kg-edge-dim');
  root.style.removeProperty('--kg-edge-dur');
}

/**
 * Read the finger release offset before the pop snapshot.
 * CSS variables inside `@keyframes` do not resolve on `::view-transition-*` in
 * the native web view, so the pop would restart at the left edge.
 */
function readEdgeCommitMotion(): EdgeCommitMotion | null {
  const root = document.documentElement;
  if (root.dataset.kgEdgeCommit !== '1') return null;
  const from = root.style.getPropertyValue('--kg-edge-from').trim();
  const under = root.style.getPropertyValue('--kg-edge-under').trim();
  const dim = Number(root.style.getPropertyValue('--kg-edge-dim'));
  const duration = Number.parseFloat(root.style.getPropertyValue('--kg-edge-dur'));
  return {
    from: from || '0px',
    under: under || '0px',
    dim: Number.isFinite(dim) ? dim : 0,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 280,
  };
}

function cancelStylesheetPop(name: 'old' | 'new'): void {
  const marker = `view-transition-${name}(root)`;
  for (const animation of document.getAnimations()) {
    const effect = animation.effect;
    if (!(effect instanceof KeyframeEffect)) continue;
    if (!effect.pseudoElement?.includes(marker)) continue;
    animation.cancel();
  }
}

/** Slide the snapshots from the release point. `ready` fires before the first painted frame. */
function playEdgeCommitMotion(transition: ViewTransition, motion: EdgeCommitMotion): void {
  const root = document.documentElement;
  const timing = {
    duration: motion.duration,
    easing: EDGE_COMMIT_EASE,
    fill: 'both' as const,
  };
  void transition.ready
    .then(() => {
      const oldPseudo = '::view-transition-old(root)';
      const newPseudo = '::view-transition-new(root)';
      const width = `${window.innerWidth || 1}px`;
      cancelStylesheetPop('old');
      cancelStylesheetPop('new');
      root.animate(
        [
          { transform: `translate3d(${motion.from}, 0, 0)` },
          { transform: `translate3d(${width}, 0, 0)` },
        ],
        { ...timing, pseudoElement: oldPseudo },
      );
      root.animate(
        [
          { transform: `translate3d(${motion.under}, 0, 0)`, filter: `brightness(${1 - motion.dim})` },
          { transform: 'translate3d(0, 0, 0)', filter: 'brightness(1)' },
        ],
        { ...timing, pseudoElement: newPseudo },
      );
    })
    .catch(() => {
      // Transition was skipped. Commit styles still clear when it finishes.
    });
}

function handlePopState(event: PopStateEvent): void {
  if (replayingPopState) return;
  if (prefersReducedMotion()) {
    takeTraverseCaptureHook();
    return;
  }
  // Safari / Chrome swipe-back already animated the page.
  if ((event as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition) {
    takeTraverseCaptureHook();
    return;
  }

  const to = normalizeNavPath(window.location.pathname);
  const from = currentPath();
  if (to === from || isPagerSwap(from, to)) {
    takeTraverseCaptureHook();
    return;
  }

  const index = navigationEntryIndex();
  const direction: NavTransitionDirection =
    index != null && committedEntryIndex != null && index > committedEntryIndex ? 'forward' : 'back';
  const { state } = event;

  event.stopImmediatePropagation();
  // Drop the live finger-tracking transform before the snapshot so the pop
  // does not add that offset twice. The release position is replayed below.
  takeTraverseCaptureHook();
  document.documentElement.dataset.kgNav = direction;
  const edgeMotion = direction === 'back' ? readEdgeCommitMotion() : null;
  const transition = document.startViewTransition(
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
  if (edgeMotion) {
    playEdgeCommitMotion(transition, edgeMotion);
    void transition.finished.finally(clearEdgeCommitStyles);
  }
}

/** Must run before Next's router registers its popstate listener. */
export function installPopStateViewTransition(): void {
  if (popStateInstalled || typeof window === 'undefined' || !supportsViewTransitions()) return;
  popStateInstalled = true;
  window.addEventListener('popstate', handlePopState, true);
}
