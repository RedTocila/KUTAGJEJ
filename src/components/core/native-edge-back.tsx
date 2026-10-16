'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { isNativeApp } from '@/lib/native-app';
import { runBeforeNextTraverseCapture } from '@/lib/nav-transition';
import { canPageNavigateBack, navigatePageBack, pageBackUsesHistory } from '@/lib/navigate-back';
import { paths } from '@/paths';

/** Touches that start in this strip are back swipes, not tab changes. */
const EDGE_PX = 24;
/** Flick past this distance still goes back when the finger is moving quickly. */
const FLICK_PX = 36;
const COMMIT_FRACTION = 0.38;
/** Previous page trails the finger at this fraction of the screen width. */
const UNDERLAY_FRACTION = 0.3;

function gestureBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true;
  if (document.querySelector('.MuiModal-root:not(.MuiModal-hidden), [aria-modal="true"]')) return true;
  const body = document.body;
  const root = document.documentElement;
  if (body.style.position === 'fixed' || body.style.overflow === 'hidden' || root.style.overflow === 'hidden') {
    return true;
  }
  return false;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsViewTransitions(): boolean {
  return typeof document.startViewTransition === 'function';
}

/**
 * iOS-style back: a rightward swipe that starts at the left edge of the screen.
 * The native shell has no Safari edge gesture, so this pops in-app history.
 * While the finger is down the page tracks it; release either finishes the pop
 * or springs back.
 */
export function NativeEdgeBack(): null {
  const router = useRouter();

  React.useEffect(() => {
    if (!isNativeApp()) return;

    let tracking = false;
    let horizontal = false;
    let settling = false;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let springTimer = 0;
    let springFrame = 0;
    let onSpringEnd: ((event: TransitionEvent) => void) | null = null;

    const root = () => document.documentElement;

    const cancelSpring = () => {
      window.clearTimeout(springTimer);
      window.cancelAnimationFrame(springFrame);
      if (onSpringEnd) {
        document.body.removeEventListener('transitionend', onSpringEnd);
        onSpringEnd = null;
      }
    };

    const clearDragVisuals = () => {
      const el = root();
      delete el.dataset.kgEdge;
      delete el.dataset.kgEdgeAnim;
      el.style.removeProperty('--kg-edge-x');
      document.getElementById('kg-edge-underlay')?.remove();
    };

    const clearEdgeStyles = () => {
      cancelSpring();
      clearDragVisuals();
      const el = root();
      delete el.dataset.kgEdgeCommit;
      el.style.removeProperty('--kg-edge-from');
      el.style.removeProperty('--kg-edge-under');
      el.style.removeProperty('--kg-edge-dim');
      el.style.removeProperty('--kg-edge-dur');
      settling = false;
    };

    const paintDrag = (x: number) => {
      const width = window.innerWidth || 1;
      const clamped = Math.max(0, Math.min(x, width));
      const el = root();
      el.dataset.kgEdge = 'drag';
      el.style.setProperty('--kg-edge-x', `${clamped}px`);
      el.style.setProperty('--kg-edge-under', `${-UNDERLAY_FRACTION * (width - clamped)}px`);
      el.style.setProperty('--kg-edge-dim', String(0.22 * (1 - clamped / width)));
      if (!document.getElementById('kg-edge-underlay')) {
        const underlay = document.createElement('div');
        underlay.id = 'kg-edge-underlay';
        underlay.setAttribute('aria-hidden', 'true');
        el.insertBefore(underlay, document.body);
      }
    };

    const springBack = (fromX: number) => {
      cancelSpring();
      settling = true;
      const ms = Math.round(Math.min(320, Math.max(200, fromX * 0.55)));
      const el = root();
      el.dataset.kgEdgeAnim = '1';
      el.style.setProperty('--kg-edge-dur', `${ms}ms`);
      const finish = () => {
        if (!settling) return;
        clearEdgeStyles();
      };
      onSpringEnd = (event: TransitionEvent) => {
        if (event.target !== document.body || event.propertyName !== 'transform') return;
        finish();
      };
      document.body.addEventListener('transitionend', onSpringEnd);
      // Transition must be committed before the transform changes, or the page snaps.
      springFrame = window.requestAnimationFrame(() => {
        paintDrag(0);
        springTimer = window.setTimeout(finish, ms + 80);
      });
    };

    const reset = () => {
      tracking = false;
      horizontal = false;
      dx = 0;
      velocity = 0;
    };

    const commitBack = (fromX: number) => {
      const width = window.innerWidth || 1;
      const el = root();
      const remaining = Math.max(0, width - fromX);
      const ms = Math.round(Math.min(340, Math.max(170, remaining * 0.42)));
      el.style.setProperty('--kg-edge-from', `${fromX}px`);
      el.style.setProperty('--kg-edge-under', `${-UNDERLAY_FRACTION * remaining}px`);
      el.style.setProperty('--kg-edge-dim', String(0.22 * (remaining / width)));
      el.style.setProperty('--kg-edge-dur', `${ms}ms`);
      el.dataset.kgEdgeCommit = '1';
      settling = true;

      const go = () => navigatePageBack(router, paths.home);

      if (pageBackUsesHistory() && supportsViewTransitions()) {
        runBeforeNextTraverseCapture(() => {
          clearDragVisuals();
          window.setTimeout(() => {
            settling = false;
          }, ms);
        });
        go();
        window.setTimeout(() => {
          if (el.dataset.kgEdge === 'drag') clearEdgeStyles();
        }, 800);
        return;
      }

      el.dataset.kgEdgeAnim = '1';
      let finished = false;
      let timer = 0;
      const finish = () => {
        if (finished) return;
        finished = true;
        document.body.removeEventListener('transitionend', onEnd);
        window.clearTimeout(timer);
        clearEdgeStyles();
        go();
      };
      const onEnd = (event: TransitionEvent) => {
        if (event.target !== document.body || event.propertyName !== 'transform') return;
        finish();
      };
      document.body.addEventListener('transitionend', onEnd);
      springFrame = window.requestAnimationFrame(() => {
        paintDrag(width);
        timer = window.setTimeout(finish, ms + 80);
      });
    };

    const onStart = (event: TouchEvent) => {
      if (settling) return;
      cancelSpring();
      reset();
      if (event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      if (touch.clientX > EDGE_PX) return;
      if (gestureBlocked(event.target)) return;
      if (window.location.pathname === paths.home && !canPageNavigateBack()) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = 0;
      lastT = performance.now();
      // Only this gesture may block scrolling. Ordinary flicks stay on the compositor.
      window.addEventListener('touchmove', onMove, { capture: true, passive: false });
      // Don't let the tab pager treat an edge swipe as a tab change.
      event.stopPropagation();
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking || settling || event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (!horizontal) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (dx <= 0 || Math.abs(dy) > Math.abs(dx)) {
          tracking = false;
          return;
        }
        horizontal = true;
      }
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) velocity = (dx - lastX) / dt;
      lastX = dx;
      lastT = now;
      if (!prefersReducedMotion()) paintDrag(dx);
      event.preventDefault();
      event.stopPropagation();
    };

    const finishGesture = (commitAllowed: boolean) => {
      const dragged = horizontal && dx > 0;
      const width = window.innerWidth || 1;
      const commit =
        commitAllowed && dragged && (dx >= width * COMMIT_FRACTION || (dx >= FLICK_PX && velocity > 0.55));
      if (commit) {
        if (prefersReducedMotion()) {
          clearEdgeStyles();
          navigatePageBack(router, paths.home);
        } else {
          commitBack(Math.min(dx, width));
        }
      } else if (dragged && !prefersReducedMotion() && root().dataset.kgEdge === 'drag') {
        springBack(dx);
      } else if (root().dataset.kgEdge === 'drag') {
        clearEdgeStyles();
      }
      reset();
    };

    const releaseMove = () => {
      window.removeEventListener('touchmove', onMove, { capture: true });
    };
    const onEnd = () => {
      releaseMove();
      finishGesture(true);
    };
    const onCancel = () => {
      releaseMove();
      finishGesture(false);
    };

    window.addEventListener('touchstart', onStart, { capture: true, passive: true });
    window.addEventListener('touchend', onEnd, { capture: true });
    window.addEventListener('touchcancel', onCancel, { capture: true });
    return () => {
      window.removeEventListener('touchstart', onStart, { capture: true });
      releaseMove();
      window.removeEventListener('touchend', onEnd, { capture: true });
      window.removeEventListener('touchcancel', onCancel, { capture: true });
      clearEdgeStyles();
    };
  }, [router]);

  return null;
}
