'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { isNativeApp } from '@/lib/native-app';
import { canPageNavigateBack, navigatePageBack } from '@/lib/navigate-back';
import { paths } from '@/paths';

/** Touches that start in this strip are back swipes, not tab changes. */
const EDGE_PX = 24;
const COMMIT_PX = 72;

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

/**
 * iOS-style back: a rightward swipe that starts at the left edge of the screen.
 * The native shell has no Safari edge gesture, so this pops in-app history.
 */
export function NativeEdgeBack(): null {
  const router = useRouter();

  React.useEffect(() => {
    if (!isNativeApp()) return;

    let tracking = false;
    let horizontal = false;
    let startX = 0;
    let startY = 0;
    let dx = 0;

    const reset = () => {
      tracking = false;
      horizontal = false;
      dx = 0;
    };

    const onStart = (event: TouchEvent) => {
      reset();
      if (event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      if (touch.clientX > EDGE_PX) return;
      if (gestureBlocked(event.target)) return;
      if (window.location.pathname === paths.home && !canPageNavigateBack()) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      // Don't let the tab pager treat an edge swipe as a tab change.
      event.stopPropagation();
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1) return;
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
      event.preventDefault();
      event.stopPropagation();
    };

    const onEnd = () => {
      if (tracking && horizontal && dx >= COMMIT_PX) {
        navigatePageBack(router, paths.home);
      }
      reset();
    };

    window.addEventListener('touchstart', onStart, { capture: true, passive: true });
    window.addEventListener('touchmove', onMove, { capture: true, passive: false });
    window.addEventListener('touchend', onEnd, { capture: true });
    window.addEventListener('touchcancel', onEnd, { capture: true });
    return () => {
      window.removeEventListener('touchstart', onStart, { capture: true });
      window.removeEventListener('touchmove', onMove, { capture: true });
      window.removeEventListener('touchend', onEnd, { capture: true });
      window.removeEventListener('touchcancel', onEnd, { capture: true });
    };
  }, [router]);

  return null;
}
