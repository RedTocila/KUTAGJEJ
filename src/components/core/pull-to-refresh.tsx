'use client';

import * as React from 'react';
import { Box, CircularProgress } from '@mui/material';

import { MOTION } from '@/styles/motion';

export const PTR_THRESHOLD_PX = 56;
export const PTR_HOLD_PX = 52;
const PTR_MAX_PX = 88;
const PTR_TIMEOUT_MS = 12_000;

function isVerticallyScrollable(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') return false;
  return el.scrollHeight > el.clientHeight + 1;
}

function verticalScrollersFromTarget(target: EventTarget | null, root: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  let el: Element | null = target instanceof Element ? target : null;
  while (el && (root === el || root.contains(el))) {
    if (el instanceof HTMLElement && isVerticallyScrollable(el)) found.push(el);
    if (el === root) break;
    el = el.parentElement;
  }
  if (!found.includes(root) && isVerticallyScrollable(root)) found.push(root);
  return found;
}

function allAtTop(scrollers: HTMLElement[]): boolean {
  return scrollers.every((el) => el.scrollTop <= 1);
}

function rubberband(dy: number): number {
  if (dy <= 0) return 0;
  return Math.min(PTR_MAX_PX, dy * 0.45);
}

type PullToRefreshOptions = {
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
};

export function usePullToRefresh({ enabled, onRefresh }: PullToRefreshOptions): {
  setRoot: (node: HTMLElement | null) => void;
  pullPx: number;
  refreshing: boolean;
  dragging: boolean;
} {
  const [root, setRoot] = React.useState<HTMLElement | null>(null);
  const [pullPx, setPullPx] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  const pullPxRef = React.useRef(0);
  const rafRef = React.useRef(0);
  const refreshingRef = React.useRef(false);
  const onRefreshRef = React.useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const paintPull = React.useCallback((next: number) => {
    pullPxRef.current = next;
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      setPullPx(pullPxRef.current);
    });
  }, []);

  React.useEffect(() => {
    if (!root || !enabled) {
      pullPxRef.current = 0;
      setPullPx(0);
      setDragging(false);
      return;
    }

    let startX = 0;
    let startY = 0;
    let locked: 'pull' | 'ignore' | null = null;

    const resetGesture = () => {
      locked = null;
      setDragging(false);
      if (!refreshingRef.current) {
        pullPxRef.current = 0;
        setPullPx(0);
      }
    };

    const onStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) {
        locked = 'ignore';
        return;
      }
      const touch = event.touches[0]!;
      const scrollers = verticalScrollersFromTarget(event.target, root);
      if (scrollers.length > 0 && !allAtTop(scrollers)) {
        locked = 'ignore';
        return;
      }
      startX = touch.clientX;
      startY = touch.clientY;
      locked = null;
    };

    const onMove = (event: TouchEvent) => {
      if (refreshingRef.current || locked === 'ignore' || event.touches.length !== 1) return;
      const touch = event.touches[0]!;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (locked == null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dx) > Math.abs(dy) * 1.15 || dy < 8) {
          locked = 'ignore';
          return;
        }
        const scrollers = verticalScrollersFromTarget(event.target, root);
        if (scrollers.length > 0 && !allAtTop(scrollers)) {
          locked = 'ignore';
          return;
        }
        locked = 'pull';
        setDragging(true);
      }
      if (locked !== 'pull') return;
      event.preventDefault();
      paintPull(rubberband(dy));
    };

    const finishRefresh = async () => {
      refreshingRef.current = true;
      setRefreshing(true);
      pullPxRef.current = PTR_HOLD_PX;
      setPullPx(PTR_HOLD_PX);
      setDragging(false);
      try {
        await Promise.race([
          Promise.resolve().then(() => onRefreshRef.current()),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, PTR_TIMEOUT_MS);
          }),
        ]);
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        pullPxRef.current = 0;
        setPullPx(0);
      }
    };

    const onEnd = () => {
      if (locked !== 'pull') {
        resetGesture();
        return;
      }
      locked = null;
      if (pullPxRef.current >= PTR_THRESHOLD_PX) {
        void finishRefresh();
        return;
      }
      setDragging(false);
      pullPxRef.current = 0;
      setPullPx(0);
    };

    root.addEventListener('touchstart', onStart, { passive: true });
    root.addEventListener('touchmove', onMove, { passive: false });
    root.addEventListener('touchend', onEnd);
    root.addEventListener('touchcancel', onEnd);
    return () => {
      root.removeEventListener('touchstart', onStart);
      root.removeEventListener('touchmove', onMove);
      root.removeEventListener('touchend', onEnd);
      root.removeEventListener('touchcancel', onEnd);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [enabled, paintPull, root]);

  return { setRoot, pullPx, refreshing, dragging };
}

export function PullToRefreshIndicator({
  pullPx,
  refreshing,
  dragging,
}: {
  pullPx: number;
  refreshing: boolean;
  dragging: boolean;
}) {
  const height = refreshing ? PTR_HOLD_PX : pullPx;
  const progress = Math.min(1, height / PTR_THRESHOLD_PX);
  const visible = height > 6;

  return (
    <Box
      aria-hidden={!refreshing}
      aria-busy={refreshing || undefined}
      sx={{
        height,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
        transition: dragging ? 'none' : `height 280ms ${MOTION.ease}`,
      }}
    >
      {visible ? (
        <Box
          sx={{
            pb: 1,
            display: 'grid',
            placeItems: 'center',
            opacity: refreshing ? 1 : Math.max(0.35, progress),
            transform: `scale(${refreshing ? 1 : 0.72 + progress * 0.28})`,
            color: 'text.secondary',
          }}
        >
          <CircularProgress size={22} thickness={4.5} color="inherit" />
        </Box>
      ) : null}
    </Box>
  );
}
