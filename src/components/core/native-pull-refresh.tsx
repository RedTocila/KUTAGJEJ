'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

import { IosSpinner } from '@/components/core/ios-spinner';
import { getNativePlatform, isNativeApp } from '@/lib/native-app';
import { runActiveTabRefresh } from '@/lib/tab-refresh';

const HOLD = 64;
const TRIGGER = 72;

/** Follow the finger until refresh, then resist. A full-screen rubber-band feels late. */
function rubberBand(distance: number): number {
  const linear = 96;
  if (distance <= linear) return distance;
  return linear + (distance - linear) * 0.22;
}

type PullWindow = Window & {
  __kutagjejPullRefresh?: () => void;
  webkit?: {
    messageHandlers?: {
      kutagjejRefresh?: { postMessage: (body: string) => void };
    };
  };
};

function gestureBlocked(): boolean {
  const body = document.body;
  const root = document.documentElement;
  if (body.style.overflow === 'hidden' || root.style.overflow === 'hidden' || body.style.position === 'fixed') {
    return true;
  }
  return Boolean(
    document.querySelector('.MuiModal-root:not(.MuiModal-hidden), [aria-modal="true"], [data-no-pull-refresh]'),
  );
}

function scrolledAway(target: EventTarget | null): boolean {
  if ((window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) > 2) return true;
  let el: Element | null = target instanceof Element ? target : null;
  for (let depth = 0; el && depth < 14; depth += 1, el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const overflowY = window.getComputedStyle(el).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 8 && el.scrollTop > 2) {
      return true;
    }
  }
  return false;
}

function installNativeRefreshBridge(): () => void {
  const win = window as PullWindow;
  win.__kutagjejPullRefresh = () => {
    const started = Date.now();
    void runActiveTabRefresh()
      .catch(() => undefined)
      .finally(() => {
        const wait = Math.max(0, 480 - (Date.now() - started));
        window.setTimeout(() => {
          win.webkit?.messageHandlers?.kutagjejRefresh?.postMessage('done');
        }, wait);
      });
  };
  return () => {
    delete win.__kutagjejPullRefresh;
  };
}

/**
 * Pull-down refresh for the iOS shell.
 * The scroll view owns the rubber-band. This only draws the spinner.
 * A rebuilt app draws UIActivityIndicatorView instead.
 */
export function NativePullRefresh(): React.JSX.Element | null {
  const [webFallback, setWebFallback] = React.useState(false);

  React.useEffect(() => {
    if (!isNativeApp() || getNativePlatform() !== 'ios') return;
    if (document.documentElement.dataset.nativePull === '1') {
      return installNativeRefreshBridge();
    }

    setWebFallback(true);
    const root = document.documentElement;
    let tracking: { x: number; y: number; armed: boolean } | null = null;
    let distance = 0;
    let pulling = false;
    let refreshing = false;
    let clearTimer = 0;
    let raf = 0;
    let queued: { next: number; interactive: boolean } | null = null;

    const paint = (next: number, interactive: boolean) => {
      const rounded = Math.round(next);
      if (rounded === distance && interactive === pulling) return;
      distance = rounded;
      pulling = interactive;
      window.clearTimeout(clearTimer);
      if (rounded > 0 || refreshing) root.dataset.kgPull = '1';
      if (interactive) root.dataset.kgPulling = '1';
      else delete root.dataset.kgPulling;
      root.style.setProperty('--kg-pull', `${rounded}px`);
      const opacity = refreshing ? 1 : Math.min(1, Math.max(0, (rounded - 8) / 36));
      root.style.setProperty('--kg-pull-p', opacity.toFixed(3));
      if (rounded === 0 && !refreshing) {
        clearTimer = window.setTimeout(() => {
          if (distance > 0 || refreshing) return;
          delete root.dataset.kgPull;
          delete root.dataset.kgPulling;
          root.style.removeProperty('--kg-pull');
          root.style.setProperty('--kg-pull-p', '0');
        }, 300);
      }
    };

    const schedulePaint = (next: number, interactive: boolean) => {
      queued = { next, interactive };
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const job = queued;
        queued = null;
        if (job) paint(job.next, job.interactive);
      });
    };

    const flushPaint = (next: number, interactive: boolean) => {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
        queued = null;
      }
      paint(next, interactive);
    };

    const onStart = (event: TouchEvent) => {
      if (refreshing || event.touches.length !== 1) return;
      if (gestureBlocked() || scrolledAway(event.target)) {
        tracking = null;
        return;
      }
      const touch = event.touches[0]!;
      tracking = { x: touch.clientX, y: touch.clientY, armed: true };
      document.addEventListener('touchmove', onMove, { passive: true, capture: true });
    };

    const onMove = (event: TouchEvent) => {
      const start = tracking;
      if (!start?.armed || refreshing || event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        start.armed = false;
        releaseMove();
        flushPaint(0, false);
        return;
      }
      if (dy <= 0 || (window.scrollY || document.documentElement.scrollTop || 0) > 2) {
        start.armed = false;
        releaseMove();
        if (distance > 0) schedulePaint(0, true);
        return;
      }
      schedulePaint(rubberBand(dy), true);
    };

    const releaseMove = () => {
      document.removeEventListener('touchmove', onMove, true);
    };

    const onEnd = () => {
      releaseMove();
      const pulled = queued?.next ?? distance;
      tracking = null;
      if (refreshing) return;
      if (pulled < TRIGGER) {
        flushPaint(0, false);
        return;
      }
      refreshing = true;
      flushPaint(HOLD, false);
      const started = Date.now();
      void runActiveTabRefresh()
        .catch(() => undefined)
        .finally(() => {
          const wait = Math.max(0, 480 - (Date.now() - started));
          window.setTimeout(() => {
            refreshing = false;
            paint(0, false);
          }, wait);
        });
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      releaseMove();
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
      window.clearTimeout(clearTimer);
      if (raf) window.cancelAnimationFrame(raf);
      delete root.dataset.kgPull;
      delete root.dataset.kgPulling;
      root.style.removeProperty('--kg-pull');
      root.style.setProperty('--kg-pull-p', '0');
    };
  }, []);

  if (!webFallback) return null;

  return createPortal(
    <div className="kg-pull-indicator" aria-hidden>
      <IosSpinner />
    </div>,
    document.documentElement,
  );
}
