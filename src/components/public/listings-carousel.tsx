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
 *
 * Each direct child gets wrapped in a fixed-width slot so cards are perfectly
 * aligned across browsers regardless of their internal markup.
 */
const DEFAULT_SLOT_WIDTH = { xs: 260, sm: 280, md: 300 } as const;

export interface ListingsCarouselProps {
  /** Pre-rendered listing cards (one per slide). */
  children: React.ReactNode;
  /**
   * Slot width in pixels per breakpoint. Tuned so 4 cards fit on a 1280px
   * desktop and ~1.2 cards peek on a 360px phone (encouraging swipe).
   * Omitted keys fall back to the homepage defaults.
   */
  slotWidth?: Partial<Record<keyof typeof DEFAULT_SLOT_WIDTH, number>>;
}

export function ListingsCarousel({ children, slotWidth }: ListingsCarouselProps) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);
  const rafRef = React.useRef(0);
  const canPrevRef = React.useRef(false);
  const canNextRef = React.useRef(false);

  const widths = { ...DEFAULT_SLOT_WIDTH, ...slotWidth };

  const refresh = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px tolerance to avoid float-rounding edge cases.
    const nextPrev = el.scrollLeft > 1;
    const nextNext = el.scrollLeft < max - 1;
    if (nextPrev === canPrevRef.current && nextNext === canNextRef.current) return;
    canPrevRef.current = nextPrev;
    canNextRef.current = nextNext;
    setCanScrollPrev(nextPrev);
    setCanScrollNext(nextNext);
  }, []);

  const scheduleRefresh = React.useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = 0;
      refresh();
    });
  }, [refresh]);

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
  }, [refresh, scheduleRefresh]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll roughly by the visible width minus one card so the user always
    // has a card of context between pages.
    const step = Math.max(el.clientWidth - widths.md, widths.md);
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const childArray = React.Children.toArray(children);

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
