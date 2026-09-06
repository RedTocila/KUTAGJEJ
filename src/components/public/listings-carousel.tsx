'use client';

import * as React from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';

import { MOTION } from '@/styles/motion';

/**
 * Horizontal one-line carousel for the homepage listings.
 *
 * - Touch / trackpad: native horizontal scroll with momentum + scroll-snap.
 * - Desktop: floating prev/next buttons appear when there is room to scroll.
 * - Mobile: a soft fade on each side hints at more content.
 * - Optional autoplay advances one snap card at a time (homepage-banner style).
 *
 * Each direct child gets wrapped in a fixed-width slot so cards are perfectly
 * aligned across browsers regardless of their internal markup.
 */
const DEFAULT_SLOT_WIDTH = { xs: 260, sm: 280, md: 300 } as const;
const DEFAULT_AUTOPLAY_MS = 5000;
const AUTOPLAY_RESUME_MS = 6000;

export interface ListingsCarouselProps {
  /** Pre-rendered listing cards (one per slide). */
  children: React.ReactNode;
  /** Keep listing media aligned across mixed categories on homepage rows. */
  equalMediaHeight?: boolean;
  /**
   * Slot width in pixels per breakpoint. Tuned so 4 cards fit on a 1280px
   * desktop and ~1.2 cards peek on a 360px phone (encouraging swipe).
   * Omitted keys fall back to the homepage defaults.
   */
  slotWidth?: Partial<Record<keyof typeof DEFAULT_SLOT_WIDTH, number>>;
  /** Fires when the nearest snap-aligned slide changes (0-based). */
  onActiveIndexChange?: (index: number) => void;
  /** Auto-advance one card at a time (loops). Off by default. */
  autoplay?: boolean;
  /** Interval between autoplay advances. Defaults to homepage banner timing. */
  autoplayMs?: number;
}

function nearestSlideIndex(el: HTMLDivElement): number {
  const slots = el.children;
  if (slots.length === 0) return 0;
  const target = el.scrollLeft;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < slots.length; i++) {
    const dist = Math.abs((slots[i] as HTMLElement).offsetLeft - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

export function ListingsCarousel({
  children,
  slotWidth,
  equalMediaHeight = false,
  onActiveIndexChange,
  autoplay = false,
  autoplayMs = DEFAULT_AUTOPLAY_MS,
}: ListingsCarouselProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);
  const rafRef = React.useRef(0);
  const canPrevRef = React.useRef(false);
  const canNextRef = React.useRef(false);
  const activeIndexRef = React.useRef(0);
  const onActiveIndexChangeRef = React.useRef(onActiveIndexChange);
  onActiveIndexChangeRef.current = onActiveIndexChange;
  const autoplayTimerRef = React.useRef<number | null>(null);
  const resumeTimerRef = React.useRef<number | null>(null);
  const reduceMotionRef = React.useRef(false);
  const pausedByUserRef = React.useRef(false);
  const inViewRef = React.useRef(true);

  const widths = { ...DEFAULT_SLOT_WIDTH, ...slotWidth };
  const childArray = React.Children.toArray(children);
  const slideCount = childArray.length;

  const refresh = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px tolerance to avoid float-rounding edge cases.
    const nextPrev = el.scrollLeft > 1;
    const nextNext = el.scrollLeft < max - 1;
    if (nextPrev !== canPrevRef.current || nextNext !== canNextRef.current) {
      canPrevRef.current = nextPrev;
      canNextRef.current = nextNext;
      setCanScrollPrev(nextPrev);
      setCanScrollNext(nextNext);
    }

    const nextIndex = nearestSlideIndex(el);
    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      onActiveIndexChangeRef.current?.(nextIndex);
    }
  }, []);

  const scheduleRefresh = React.useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      refresh();
    });
  }, [refresh]);

  const scrollToIndex = React.useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    const count = el.children.length;
    if (count === 0) return;
    const safe = ((index % count) + count) % count;
    const slot = el.children[safe] as HTMLElement | undefined;
    if (!slot) return;
    const useSmooth = behavior === 'smooth' && !reduceMotionRef.current;
    el.scrollTo({ left: slot.offsetLeft, behavior: useSmooth ? 'smooth' : 'auto' });
  }, []);

  const clearAutoplay = React.useCallback(() => {
    if (autoplayTimerRef.current != null) {
      window.clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const clearResume = React.useCallback(() => {
    if (resumeTimerRef.current != null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const startAutoplay = React.useCallback(() => {
    clearAutoplay();
    if (
      !autoplay ||
      slideCount < 2 ||
      reduceMotionRef.current ||
      pausedByUserRef.current ||
      !inViewRef.current
    ) {
      return;
    }
    autoplayTimerRef.current = window.setInterval(() => {
      const el = scrollRef.current;
      if (!el || el.children.length < 2) return;
      const next = (nearestSlideIndex(el) + 1) % el.children.length;
      scrollToIndex(next, 'smooth');
    }, autoplayMs);
  }, [autoplay, autoplayMs, clearAutoplay, scrollToIndex, slideCount]);

  const pauseAutoplayForInteraction = React.useCallback(() => {
    if (!autoplay) return;
    pausedByUserRef.current = true;
    clearAutoplay();
    clearResume();
    resumeTimerRef.current = window.setTimeout(() => {
      pausedByUserRef.current = false;
      startAutoplay();
    }, AUTOPLAY_RESUME_MS);
  }, [autoplay, clearAutoplay, clearResume, startAutoplay]);

  React.useEffect(() => {
    reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  React.useEffect(() => {
    refresh();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', scheduleRefresh, { passive: true });
    const ro = new ResizeObserver(scheduleRefresh);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', scheduleRefresh);
      ro.disconnect();
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [refresh, scheduleRefresh, slideCount]);

  React.useEffect(() => {
    if (!autoplay) {
      clearAutoplay();
      clearResume();
      return;
    }
    const el = scrollRef.current;
    if (!el) return;

    const onPointer = () => pauseAutoplayForInteraction();
    el.addEventListener('pointerdown', onPointer, { passive: true });
    el.addEventListener('wheel', onPointer, { passive: true });
    el.addEventListener('touchstart', onPointer, { passive: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = Boolean(entry?.isIntersecting);
        if (inViewRef.current) startAutoplay();
        else clearAutoplay();
      },
      { threshold: 0.35 },
    );
    io.observe(el);

    startAutoplay();
    return () => {
      el.removeEventListener('pointerdown', onPointer);
      el.removeEventListener('wheel', onPointer);
      el.removeEventListener('touchstart', onPointer);
      io.disconnect();
      clearAutoplay();
      clearResume();
    };
  }, [autoplay, clearAutoplay, clearResume, pauseAutoplayForInteraction, slideCount, startAutoplay]);

  const scrollBy = (direction: 1 | -1) => {
    pauseAutoplayForInteraction();
    const el = scrollRef.current;
    if (!el) return;
    // One snap card at a time when autoplay is on (matches “1-10” counter UX);
    // otherwise page by roughly the visible width.
    if (autoplay) {
      scrollToIndex(activeIndexRef.current + direction, 'smooth');
      return;
    }
    const step = Math.max(el.clientWidth - widths.md, widths.md);
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const maskImage = (() => {
    if (canScrollPrev && canScrollNext) {
      return 'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)';
    }
    if (canScrollPrev) {
      return 'linear-gradient(to right, transparent 0, black 24px, black 100%)';
    }
    if (canScrollNext) {
      return 'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)';
    }
    return undefined;
  })();

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Box
        ref={scrollRef}
        data-no-tab-swipe
        sx={{
          display: 'flex',
          alignItems: 'stretch',
          gap: { xs: 1.25, md: 1.75 },
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          overscrollBehaviorX: 'contain',
          scrollSnapType: 'x mandatory',
          scrollPadding: { xs: '0 12px', md: '0 4px' },
          // Native rubber-band & momentum on iOS without showing scrollbars.
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // Allow card hover transforms to escape vertically.
          py: 1,
          px: { xs: 0.25, md: 0 },
          // Soft fade on the edge that has more content to discover.
          maskImage,
          transition: `mask-image ${MOTION.fast} linear`,
          ...(equalMediaHeight
            ? {
                '& .listing-card-media': {
                  height: { xs: 238, md: 256 },
                  minHeight: 0,
                  aspectRatio: 'auto',
                },
              }
            : null),
        }}
      >
        {childArray.map((child, index) => (
          <Box
            key={index}
            sx={{
              flex: '0 0 auto',
              width: widths,
              scrollSnapAlign: 'start',
              display: 'flex',
            }}
          >
            <Box sx={{ width: '100%' }}>{child}</Box>
          </Box>
        ))}
      </Box>

      {canScrollPrev ? (
        <IconButton
          aria-label="Listingjet e mëparshme"
          onClick={() => scrollBy(-1)}
          size="small"
          sx={{
            position: 'absolute',
            top: '45%',
            left: { xs: 4, md: -16 },
            transform: 'translateY(-50%)',
            display: { xs: 'none', md: 'inline-flex' },
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
            width: 36,
            height: 36,
            transition: `border-color ${MOTION.fast} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}`,
            '&:hover': { bgcolor: 'background.paper', borderColor: 'primary.main', color: 'primary.main' },
          }}
        >
          <ChevronLeft sx={{ fontSize: 20 }} />
        </IconButton>
      ) : null}

      {canScrollNext ? (
        <IconButton
          aria-label="Listingjet e ardhshme"
          onClick={() => scrollBy(1)}
          size="small"
          sx={{
            position: 'absolute',
            top: '45%',
            right: { xs: 4, md: -16 },
            transform: 'translateY(-50%)',
            display: { xs: 'none', md: 'inline-flex' },
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
            width: 36,
            height: 36,
            transition: `border-color ${MOTION.fast} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}`,
            '&:hover': { bgcolor: 'background.paper', borderColor: 'primary.main', color: 'primary.main' },
          }}
        >
          <ChevronRight sx={{ fontSize: 20 }} />
        </IconButton>
      ) : null}
    </Box>
  );
}
