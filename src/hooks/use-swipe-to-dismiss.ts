'use client';

import * as React from 'react';

import { MOTION } from '@/styles/motion';

const DEFAULT_THRESHOLD_PX = 96;
const DEFAULT_VELOCITY = 0.55;
const SETTLE_MS = 220;
const DISMISS_MS = 260;
const AXIS_LOCK_PX = 10;
const RUBBER = 0.55;

export type SwipeToDismissOptions = {
  enabled?: boolean;
  onDismiss: () => void;
  /** Distance (px) that commits a dismiss. */
  thresholdPx?: number;
  /** Flick velocity (px/ms) that commits a dismiss. */
  velocityPxPerMs?: number;
  /**
   * When true, paper gestures only start if scrollTop is 0
   * (pull-to-dismiss on scrollable sheets). Handle binds ignore this.
   */
  requireScrollTop?: boolean;
  /** Also fade the target itself (fullscreen lightbox). */
  fadeTarget?: boolean;
};

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function findBackdrop(paper: HTMLElement | null): HTMLElement | null {
  if (!paper) return null;
  const modal = paper.closest('.MuiModal-root');
  return (modal?.querySelector('.MuiBackdrop-root') as HTMLElement | null) ?? null;
}

/**
 * Vertical swipe-down to dismiss (lightbox / bottom sheets).
 * Updates transform + backdrop opacity on the DOM during the drag (no per-frame React renders).
 */
export function useSwipeToDismiss({
  enabled = true,
  onDismiss,
  thresholdPx = DEFAULT_THRESHOLD_PX,
  velocityPxPerMs = DEFAULT_VELOCITY,
  requireScrollTop = false,
  fadeTarget = false,
}: SwipeToDismissOptions) {
  const targetRef = React.useRef<HTMLElement | null>(null);
  const scrollParentRef = React.useRef<HTMLElement | null>(null);
  const backdropRef = React.useRef<HTMLElement | null>(null);
  const startRef = React.useRef<{ x: number; y: number; t: number } | null>(null);
  const lastRef = React.useRef<{ y: number; t: number } | null>(null);
  const offsetRef = React.useRef(0);
  const modeRef = React.useRef<'undecided' | 'dismiss' | 'ignore'>('undecided');
  /** Handle drags skip the scrollTop gate. */
  const fromHandleRef = React.useRef(false);
  const pointerIdRef = React.useRef<number | null>(null);
  const settlingRef = React.useRef(false);
  const onDismissRef = React.useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const enabledRef = React.useRef(enabled);
  enabledRef.current = enabled;
  const requireScrollTopRef = React.useRef(requireScrollTop);
  requireScrollTopRef.current = requireScrollTop;
  const thresholdRef = React.useRef(thresholdPx);
  thresholdRef.current = thresholdPx;
  const velocityRef = React.useRef(velocityPxPerMs);
  velocityRef.current = velocityPxPerMs;
  const fadeTargetRef = React.useRef(fadeTarget);
  fadeTargetRef.current = fadeTarget;

  const applyVisual = React.useCallback((offset: number, withTransition: boolean, durationMs = SETTLE_MS) => {
    const el = targetRef.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const progress = Math.min(1, offset / Math.max(thresholdRef.current * 1.6, 1));
    const props = fadeTargetRef.current ? 'transform, opacity' : 'transform';
    const transition =
      withTransition && !reduced
        ? props
            .split(', ')
            .map((p) => `${p} ${durationMs}ms ${MOTION.ease}`)
            .join(', ')
        : 'none';
    el.style.transition = transition;
    // Important so we can drag sheets that force `transform: none !important` (iOS keyboard).
    if (offset > 0.5) {
      el.style.setProperty('transform', `translate3d(0, ${offset}px, 0)`, 'important');
    } else {
      el.style.removeProperty('transform');
    }
    if (fadeTargetRef.current) {
      el.style.opacity = offset > 0.5 ? String(Math.max(0.15, 1 - progress * 0.85)) : '';
    }
    el.style.willChange = offset > 0.5 || withTransition ? props : '';

    const backdrop = backdropRef.current ?? findBackdrop(el);
    if (backdrop) {
      backdropRef.current = backdrop;
      backdrop.style.transition =
        withTransition && !reduced ? `opacity ${durationMs}ms ${MOTION.ease}` : 'none';
      backdrop.style.opacity = offset > 0.5 ? String(Math.max(0, 1 - progress)) : '';
    }
  }, []);

  const resetVisual = React.useCallback(() => {
    offsetRef.current = 0;
    const backdrop = backdropRef.current;
    if (backdrop) {
      backdrop.style.transition = '';
      backdrop.style.opacity = '';
    }
    const el = targetRef.current;
    if (el) {
      el.style.transition = '';
      el.style.removeProperty('transform');
      el.style.opacity = '';
      el.style.willChange = '';
    }
  }, []);

  const settleBack = React.useCallback(() => {
    settlingRef.current = true;
    offsetRef.current = 0;
    applyVisual(0, true, SETTLE_MS);
    window.setTimeout(() => {
      settlingRef.current = false;
      resetVisual();
    }, SETTLE_MS + 20);
  }, [applyVisual, resetVisual]);

  const commitDismiss = React.useCallback(() => {
    settlingRef.current = true;
    const el = targetRef.current;
    const height = el?.getBoundingClientRect().height ?? window.innerHeight;
    const travel = Math.max(height * 1.05, offsetRef.current + 120);
    offsetRef.current = travel;
    applyVisual(travel, true, DISMISS_MS);

    const backdrop = backdropRef.current ?? findBackdrop(el);
    if (backdrop) {
      backdropRef.current = backdrop;
      backdrop.style.transition = prefersReducedMotion() ? 'none' : `opacity ${DISMISS_MS}ms ${MOTION.ease}`;
      backdrop.style.opacity = '0';
    }

    window.setTimeout(() => {
      onDismissRef.current();
      settlingRef.current = false;
      window.setTimeout(() => resetVisual(), 40);
    }, prefersReducedMotion() ? 0 : DISMISS_MS);
  }, [applyVisual, resetVisual]);

  const setTarget = React.useCallback((node: HTMLElement | null) => {
    targetRef.current = node;
    if (!node) {
      backdropRef.current = null;
      return;
    }
    backdropRef.current = findBackdrop(node);
  }, []);

  const setScrollParent = React.useCallback((node: HTMLElement | null) => {
    scrollParentRef.current = node;
  }, []);

  const paperRef = React.useCallback(
    (node: HTMLElement | null) => {
      setTarget(node);
      setScrollParent(node);
    },
    [setScrollParent, setTarget],
  );

  const canStartDismiss = React.useCallback(() => {
    if (!enabledRef.current || settlingRef.current) return false;
    if (fromHandleRef.current || !requireScrollTopRef.current) return true;
    const el = scrollParentRef.current ?? targetRef.current;
    if (!el) return true;
    return el.scrollTop <= 0;
  }, []);

  const begin = React.useCallback((event: React.PointerEvent<HTMLElement>, fromHandle: boolean) => {
    if (!enabledRef.current || settlingRef.current) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    if (pointerIdRef.current != null) return;

    fromHandleRef.current = fromHandle;
    pointerIdRef.current = event.pointerId;
    startRef.current = { x: event.clientX, y: event.clientY, t: performance.now() };
    lastRef.current = { y: event.clientY, t: performance.now() };
    modeRef.current = 'undecided';
    offsetRef.current = 0;
  }, []);

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (pointerIdRef.current !== event.pointerId || !startRef.current) return;
      if (settlingRef.current) return;

      const dx = event.clientX - startRef.current.x;
      const dy = event.clientY - startRef.current.y;
      const now = performance.now();
      lastRef.current = { y: event.clientY, t: now };

      if (modeRef.current === 'undecided') {
        if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
        if (dy > 0 && Math.abs(dy) >= Math.abs(dx) && canStartDismiss()) {
          modeRef.current = 'dismiss';
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* ignore */
          }
        } else {
          modeRef.current = 'ignore';
          return;
        }
      }

      if (modeRef.current !== 'dismiss') return;

      event.preventDefault();
      event.stopPropagation();

      const raw = Math.max(0, dy);
      const offset = raw <= thresholdRef.current ? raw : thresholdRef.current + (raw - thresholdRef.current) * RUBBER;
      offsetRef.current = offset;
      applyVisual(offset, false);
    },
    [applyVisual, canStartDismiss],
  );

  const finish = React.useCallback(
    (event: React.PointerEvent<HTMLElement>, commit: boolean) => {
      if (pointerIdRef.current !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      }

      const mode = modeRef.current;
      const offset = offsetRef.current;
      const start = startRef.current;
      const last = lastRef.current;

      pointerIdRef.current = null;
      startRef.current = null;
      lastRef.current = null;
      fromHandleRef.current = false;
      modeRef.current = 'undecided';

      if (mode !== 'dismiss') {
        offsetRef.current = 0;
        return;
      }

      let velocity = 0;
      if (start && last && last.t > start.t) {
        velocity = (last.y - start.y) / (last.t - start.t);
      }

      const shouldDismiss =
        commit && (offset >= thresholdRef.current || velocity >= velocityRef.current);

      if (shouldDismiss) commitDismiss();
      else settleBack();
    },
    [commitDismiss, settleBack],
  );

  const onPointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      finish(event, true);
    },
    [finish],
  );

  const onPointerCancel = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      finish(event, false);
    },
    [finish],
  );

  const cancelActive = React.useCallback(() => {
    if (pointerIdRef.current == null && modeRef.current === 'undecided') return;
    const mode = modeRef.current;
    pointerIdRef.current = null;
    startRef.current = null;
    lastRef.current = null;
    fromHandleRef.current = false;
    modeRef.current = 'undecided';
    if (mode === 'dismiss' && offsetRef.current > 0.5) settleBack();
    else {
      offsetRef.current = 0;
      resetVisual();
    }
  }, [resetVisual, settleBack]);

  /** Bind to the sheet paper (pull-to-dismiss when scrolled to top). */
  const paperBind = React.useMemo(
    () => ({
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => begin(event, false),
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    }),
    [begin, onPointerCancel, onPointerMove, onPointerUp],
  );

  /** Bind to the drag handle / header — always eligible to dismiss. */
  const handleBind = React.useMemo(
    () => ({
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        begin(event, true);
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        if (modeRef.current === 'dismiss') event.stopPropagation();
        onPointerMove(event);
      },
      onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        onPointerUp(event);
      },
      onPointerCancel: (event: React.PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        onPointerCancel(event);
      },
      style: { touchAction: 'none' as const, cursor: 'grab' as const },
    }),
    [begin, onPointerCancel, onPointerMove, onPointerUp],
  );

  React.useEffect(() => {
    if (!enabled) resetVisual();
  }, [enabled, resetVisual]);

  return {
    paperRef,
    setTarget,
    setScrollParent,
    paperBind,
    handleBind,
    cancelActive,
    handlers: {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => begin(event, false),
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    applyVisual,
    resetVisual,
    commitDismiss,
    isDismissGesture: () => modeRef.current === 'dismiss',
    getOffset: () => offsetRef.current,
  };
}

/** Shared drag-handle pill for bottom sheets. */
export function sheetDragHandleSx(active = true) {
  return {
    width: 36,
    height: 4,
    borderRadius: 999,
    bgcolor: 'action.disabled',
    mx: 'auto',
    mb: 1.25,
    ...(active
      ? {
          touchAction: 'none',
          cursor: 'grab',
          // Larger hit target without changing the visual pill.
          position: 'relative' as const,
          '&::before': {
            content: '""',
            position: 'absolute',
            left: -24,
            right: -24,
            top: -14,
            bottom: -14,
          },
        }
      : null),
  } as const;
}
