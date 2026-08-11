'use client';

import * as React from 'react';

import { MOTION } from '@/styles/motion';

const DEFAULT_SLIDE_MS = 320;
const DEFAULT_SWIPE_THRESHOLD = 48;
const DEFAULT_AUTOPLAY_MS = 5000;

export interface UseBannerSliderOptions {
  slideCount: number;
  /** Slide settle duration in ms. Keep short so swipes feel snappy. */
  slideMs?: number;
  autoplayMs?: number;
  swipeThreshold?: number;
}

/**
 * Banner / promo slider with DOM-driven drag.
 *
 * Swipe offsets update `transform` on the track element directly (no React
 * re-render per touchmove). Index changes still go through state so dots /
 * a11y stay in sync.
 */
export function useBannerSlider({
  slideCount,
  slideMs = DEFAULT_SLIDE_MS,
  autoplayMs = DEFAULT_AUTOPLAY_MS,
  swipeThreshold = DEFAULT_SWIPE_THRESHOLD,
}: UseBannerSliderOptions) {
  const [idx, setIdx] = React.useState(0);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const idxRef = React.useRef(0);
  const touchStartX = React.useRef<number | null>(null);
  const dragOffsetRef = React.useRef(0);
  const isDraggingRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);
  const suppressNavRef = React.useRef(false);
  const reduceMotionRef = React.useRef(false);
  const slideCountRef = React.useRef(slideCount);
  const slideBasisRef = React.useRef(slideCount > 0 ? 100 / slideCount : 100);
  const transitionCssRef = React.useRef(`transform ${slideMs}ms ${MOTION.ease}`);

  slideCountRef.current = slideCount;
  slideBasisRef.current = slideCount > 0 ? 100 / slideCount : 100;
  transitionCssRef.current = `transform ${slideMs}ms ${MOTION.ease}`;

  const applyTransform = React.useCallback((index: number, offsetPx: number, withTransition: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    const useTransition = withTransition && !reduceMotionRef.current;
    el.style.transition = useTransition ? transitionCssRef.current : 'none';
    el.style.transform = `translate3d(calc(-${index * slideBasisRef.current}% + ${offsetPx}px), 0, 0)`;
  }, []);

  const clearAutoPlay = React.useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoPlay = React.useCallback(() => {
    clearAutoPlay();
    if (slideCountRef.current < 2 || reduceMotionRef.current) return;
    timerRef.current = window.setInterval(() => {
      const count = slideCountRef.current;
      if (count < 2) return;
      const next = (idxRef.current + 1) % count;
      idxRef.current = next;
      setIdx(next);
      applyTransform(next, 0, true);
    }, autoplayMs);
  }, [applyTransform, autoplayMs, clearAutoPlay]);

  React.useEffect(() => {
    reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  React.useEffect(() => {
    idxRef.current = 0;
    setIdx(0);
    const raf = window.requestAnimationFrame(() => {
      applyTransform(0, 0, false);
    });
    startAutoPlay();
    return () => {
      window.cancelAnimationFrame(raf);
      clearAutoPlay();
    };
  }, [applyTransform, clearAutoPlay, slideCount, startAutoPlay]);

  const goToSlide = React.useCallback(
    (next: number) => {
      const count = slideCountRef.current;
      if (count === 0) return;
      const safe = ((next % count) + count) % count;
      idxRef.current = safe;
      setIdx(safe);
      applyTransform(safe, 0, true);
      startAutoPlay();
    },
    [applyTransform, startAutoPlay],
  );

  const handleTouchStart = React.useCallback(
    (event: React.TouchEvent) => {
      if (slideCountRef.current < 2) return;
      touchStartX.current = event.touches[0]?.clientX ?? null;
      isDraggingRef.current = true;
      dragOffsetRef.current = 0;
      clearAutoPlay();
      applyTransform(idxRef.current, 0, false);
    },
    [applyTransform, clearAutoPlay],
  );

  const handleTouchMove = React.useCallback(
    (event: React.TouchEvent) => {
      if (touchStartX.current == null || slideCountRef.current < 2) return;
      const currentX = event.touches[0]?.clientX;
      if (currentX == null) return;
      const delta = currentX - touchStartX.current;
      dragOffsetRef.current = delta;
      applyTransform(idxRef.current, delta, false);
    },
    [applyTransform],
  );

  const finishDrag = React.useCallback(
    (endX: number | null) => {
      if (touchStartX.current == null) return;
      const delta = endX != null ? endX - touchStartX.current : dragOffsetRef.current;
      touchStartX.current = null;
      isDraggingRef.current = false;
      dragOffsetRef.current = 0;

      if (Math.abs(delta) >= swipeThreshold) {
        suppressNavRef.current = true;
        if (delta <= -swipeThreshold) {
          goToSlide(idxRef.current + 1);
        } else {
          goToSlide(idxRef.current - 1);
        }
      } else {
        applyTransform(idxRef.current, 0, true);
        startAutoPlay();
      }
    },
    [applyTransform, goToSlide, startAutoPlay, swipeThreshold],
  );

  const handleTouchEnd = React.useCallback(
    (event: React.TouchEvent) => {
      finishDrag(event.changedTouches[0]?.clientX ?? null);
    },
    [finishDrag],
  );

  const handleTouchCancel = React.useCallback(() => {
    finishDrag(null);
  }, [finishDrag]);

  const safeIdx = slideCount > 0 ? idx % slideCount : 0;
  const slideBasis = slideCount > 0 ? 100 / slideCount : 100;

  return {
    idx: safeIdx,
    slideBasis,
    trackRef,
    suppressNavRef,
    goToSlide,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    trackSx: {
      display: 'flex' as const,
      width: `${Math.max(slideCount, 1) * 100}%`,
      // Initial position; drag/autoplay write inline transform for 60fps.
      transform: `translate3d(-${safeIdx * slideBasis}%, 0, 0)`,
      willChange: 'transform' as const,
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  };
}
