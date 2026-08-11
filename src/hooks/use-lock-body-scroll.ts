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

const SCROLL_LOCK_ALLOW_SELECTOR = [
  '.MuiModal-root',
  '.MuiDrawer-root',
  '.MuiPopover-root',
  '.MuiPopper-root',
  '.MuiMenu-root',
  '.MuiAutocomplete-popper',
  '[role="dialog"][aria-modal="true"]',
  '[role="listbox"]',
  '[data-scroll-lock-allow]',
].join(', ');

function isAllowedScrollTarget(event: Event): boolean {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    if (node.matches(SCROLL_LOCK_ALLOW_SELECTOR) || node.closest(SCROLL_LOCK_ALLOW_SELECTOR)) {
      return true;
    }
  }
  return false;
}

export function useLockBodyScroll(locked: boolean): void {
  React.useEffect(() => {
    if (!locked) return undefined;
    applyLock();

    const blockIfOutside = (event: Event) => {
      if (!isAllowedScrollTarget(event)) {
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
