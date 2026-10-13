'use client';

import * as React from 'react';

import { getNativePlatform, isNativeApp } from '@/lib/native-app';
import { runActiveTabRefresh } from '@/lib/tab-refresh';

const THRESHOLD = 68;
const MAX_PULL = 108;

function IosSpinner(): React.JSX.Element {
  return (
    <span className="kg-ios-spinner" aria-hidden>
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          style={{
            transform: `rotate(${index * 30}deg)`,
            animationDelay: `${(-0.9 + index * 0.075).toFixed(3)}s`,
          }}
        />
      ))}
    </span>
  );
}

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
  if ((window.scrollY || rootScrollTop()) > 2) return true;
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

function rootScrollTop(): number {
  return document.documentElement.scrollTop || document.body.scrollTop || 0;
}

/**
 * Pull-down refresh for the iOS shell, with the system activity indicator.
 * The website does not get this gesture.
 */
export function NativePullRefresh(): React.JSX.Element | null {
  const [enabled, setEnabled] = React.useState(false);
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [dark, setDark] = React.useState(true);
  const pullRef = React.useRef(0);
  const refreshingRef = React.useRef(false);
  const tracking = React.useRef<{ x: number; y: number; armed: boolean } | null>(null);

  React.useEffect(() => {
    if (!isNativeApp() || getNativePlatform() !== 'ios') return;
    setEnabled(true);
    const sync = () => setDark(document.documentElement.classList.contains('dark'));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    refreshingRef.current = refreshing;

    const resetPull = () => {
      pullRef.current = 0;
      setPull(0);
      setDragging(false);
    };

    const onStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) return;
      if (gestureBlocked() || scrolledAway(event.target)) {
        tracking.current = null;
        return;
      }
      const touch = event.touches[0]!;
      tracking.current = { x: touch.clientX, y: touch.clientY, armed: true };
    };

    const onMove = (event: TouchEvent) => {
      const start = tracking.current;
      if (!start?.armed || refreshingRef.current || event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) {
        start.armed = false;
        resetPull();
        return;
      }
      if (dy <= 8 || scrolledAway(event.target)) {
        resetPull();
        return;
      }
      const next = Math.min(MAX_PULL, (dy - 8) * 0.42);
      pullRef.current = next;
      setDragging(true);
      setPull(next);
    };

    const onEnd = () => {
      const distance = pullRef.current;
      tracking.current = null;
      setDragging(false);
      pullRef.current = 0;
      if (refreshingRef.current) return;
      if (distance < THRESHOLD) {
        setPull(0);
        return;
      }
      setPull(52);
      setRefreshing(true);
      refreshingRef.current = true;
      const started = Date.now();
      void runActiveTabRefresh()
        .catch(() => undefined)
        .finally(() => {
          const wait = Math.max(0, 600 - (Date.now() - started));
          window.setTimeout(() => {
            refreshingRef.current = false;
            setRefreshing(false);
            setPull(0);
          }, wait);
        });
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, refreshing]);

  if (!enabled) return null;

  const progress = refreshing ? 1 : Math.min(1, pull / THRESHOLD);
  const visible = refreshing || pull > 8;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        zIndex: 5000,
        left: 0,
        right: 0,
        top: 'calc(var(--kg-safe-top, 59px) + 6px)',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: visible ? progress : 0,
        transform: `translate3d(0, ${refreshing ? 0 : Math.max(0, pull - 24)}px, 0) scale(${0.7 + progress * 0.3})`,
        transition: dragging ? 'none' : 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1), opacity 180ms ease',
        color: dark ? 'rgba(255, 255, 255, 0.92)' : 'rgba(60, 60, 67, 0.72)',
      }}
    >
      <IosSpinner />
    </div>
  );
}
