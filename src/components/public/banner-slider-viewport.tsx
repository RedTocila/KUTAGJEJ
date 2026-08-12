'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { bannerSliderSideMask } from '@/hooks/use-banner-slider';
import { MOTION } from '@/styles/motion';

type BannerSliderViewportProps = {
  idx: number;
  slideCount: number;
  slideBasis: number;
  trackRef: React.Ref<HTMLDivElement>;
  trackSx: object;
  touchHandlers: {
    onTouchStart: React.TouchEventHandler;
    onTouchMove: React.TouchEventHandler;
    onTouchEnd: React.TouchEventHandler;
    onTouchCancel: React.TouchEventHandler;
  };
  children: React.ReactNode;
  /** First slide sits flush to the left on mobile; later slides keep side peeks. */
  flushFirstSlide?: boolean;
  /** `contained` hides neighbor peeks; `peek` shows adjacent cards in the gutter. */
  variant?: 'peek' | 'contained';
};

/**
 * Banner track: `contained` clips to the current slide (home banners + category
 * sliders). `peek` shows adjacent cards in the side gutter.
 */
export function BannerSliderViewport({
  idx,
  slideCount,
  slideBasis,
  trackRef,
  trackSx,
  touchHandlers,
  children,
  flushFirstSlide = false,
  variant = 'peek',
}: BannerSliderViewportProps) {
  const slides = React.Children.toArray(children);
  const contained = variant === 'contained';
  const maskImage = contained ? undefined : bannerSliderSideMask(idx, slideCount);

  return (
    <Box
      {...touchHandlers}
      sx={{
        position: 'relative',
        minWidth: 0,
        mx: contained ? 0 : { xs: -2, md: 0 },
        overflow: 'hidden',
        touchAction: 'pan-y',
        overscrollBehaviorX: 'none',
        cursor: slideCount > 1 ? 'grab' : undefined,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...(maskImage
          ? {
              maskImage: { xs: maskImage, md: 'none' },
              WebkitMaskImage: { xs: maskImage, md: 'none' },
              transition: `mask-image ${MOTION.fast} linear`,
            }
          : null),
      }}
    >
      <Box
        sx={(theme) => ({
          px: contained ? 0 : { xs: 3.5, md: 0 },
          minWidth: 0,
          '--banner-first-flush': flushFirstSlide && !contained ? `-${theme.spacing(3.5)}` : '0px',
          [theme.breakpoints.up('md')]: {
            '--banner-first-flush': '0px',
          },
        })}
      >
        <Box ref={trackRef} sx={{ ...trackSx, maxWidth: 'none' }}>
          {slides.map((child, i) => (
            <Box
              key={(React.isValidElement(child) && child.key) || i}
              sx={{
                flex: `0 0 ${slideBasis}%`,
                minWidth: 0,
                // Gap between cards while sliding (border-box keeps % transforms correct).
                px: contained ? 1 : { xs: 0.75, md: 0 },
                ...(flushFirstSlide && !contained && i === 0 ? { pl: { xs: 0, md: 0 } } : null),
                boxSizing: 'border-box',
              }}
            >
              {child}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
