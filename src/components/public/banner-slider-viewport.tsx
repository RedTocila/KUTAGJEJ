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
};

/**
 * Full-bleed (mobile) banner track: adjacent cards peek in the side gutter,
 * with the same edge fade used by homepage category listing carousels.
 */
export function BannerSliderViewport({
  idx,
  slideCount,
  slideBasis,
  trackRef,
  trackSx,
  touchHandlers,
  children,
}: BannerSliderViewportProps) {
  const slides = React.Children.toArray(children);
  const maskImage = bannerSliderSideMask(idx, slideCount);

  return (
    <Box
      {...touchHandlers}
      sx={{
        position: 'relative',
        minWidth: 0,
        mx: { xs: -2, md: 0 },
        overflow: 'hidden',
        touchAction: 'pan-y',
        overscrollBehaviorX: 'none',
        cursor: slideCount > 1 ? 'grab' : undefined,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        maskImage: { xs: maskImage, md: 'none' },
        WebkitMaskImage: { xs: maskImage, md: 'none' },
        transition: `mask-image ${MOTION.fast} linear`,
      }}
    >
      <Box sx={{ px: { xs: 3.5, md: 0 }, minWidth: 0 }}>
        <Box ref={trackRef} sx={{ ...trackSx, maxWidth: 'none' }}>
          {slides.map((child, i) => (
            <Box
              key={(React.isValidElement(child) && child.key) || i}
              sx={{
                flex: `0 0 ${slideBasis}%`,
                minWidth: 0,
                px: { xs: 0.75, md: 0 },
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
