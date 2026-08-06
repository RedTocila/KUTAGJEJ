'use client';

import * as React from 'react';

/**
 * Nested-safe body scroll lock (iOS-friendly via position:fixed).
 * Also blocks wheel/touch on content outside open modals/dialogs.
 */
let lockCount = 0;
let savedScrollY = 0;
let savedHtmlOverflow = '';
let savedBody: {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
} | null = null;

function applyLock() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const { body, documentElement } = document;
    savedHtmlOverflow = documentElement.style.overflow;
    savedBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
  }
  lockCount += 1;
}

function releaseLock() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0 || !savedBody) return;

  const { body, documentElement } = document;
  documentElement.style.overflow = savedHtmlOverflow;
  body.style.overflow = savedBody.overflow;
  body.style.position = savedBody.position;
  body.style.top = savedBody.top;
  body.style.left = savedBody.left;
  body.style.right = savedBody.right;
  body.style.width = savedBody.width;
  savedBody = null;
  window.scrollTo(0, savedScrollY);
}

function isInsideOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      '.MuiModal-root, .MuiDrawer-root, [role="dialog"][aria-modal="true"], [data-scroll-lock-allow]',
    ),
  );
}

export function useLockBodyScroll(locked: boolean): void {
  React.useEffect(() => {
    if (!locked) return undefined;
    applyLock();

    const blockIfOutside = (event: Event) => {
      if (!isInsideOverlay(event.target)) {
        event.preventDefault();
      }
    };

    // Capture phase so background page cannot scroll/interact under the overlay.
    window.addEventListener('wheel', blockIfOutside, { capture: true, passive: false });
    window.addEventListener('touchmove', blockIfOutside, { capture: true, passive: false });

    return () => {
      window.removeEventListener('wheel', blockIfOutside, true);
      window.removeEventListener('touchmove', blockIfOutside, true);
      releaseLock();
    };
  }, [locked]);
}
