'use client';

import * as React from 'react';
import { Box, Stack } from '@mui/material';

import type { HomeBannerDto } from '@/lib/home-banners-client';
import { useBannerSlider } from '@/hooks/use-banner-slider';
import { useCopy } from '@/hooks/use-copy';
import { BANNER_SLIDE_VISUALS, BannerSlideCard } from '@/components/public/banner-slide-card';
import { BannerSliderPager } from '@/components/public/banner-slider-pager';
import { BannerSliderViewport } from '@/components/public/banner-slider-viewport';

export interface HomeBannerCarouselProps {
  banners?: HomeBannerDto[];
}

const SLIDE_MS = 320;

function slideHref(slide: HomeBannerDto): string | null {
  const href = slide.ctaHref?.trim();
  return href || null;
}

export function HomeBannerCarousel({ banners = [] }: HomeBannerCarouselProps) {
  const t = useCopy();
  const slides = banners;
  const { idx, slideBasis, trackRef, suppressNavRef, goToSlide, autoplay, toggleAutoplay, touchHandlers, trackSx } =
    useBannerSlider({
      slideCount: slides.length,
      slideMs: SLIDE_MS,
    });

  if (slides.length === 0) return null;

  return (
    <Box component="section" aria-label="Banner kryesor" sx={{ width: '100%' }}>
      <Stack spacing={0.25} sx={{ width: '100%', pb: 0.5 }}>
        <BannerSliderViewport
          idx={idx}
          slideCount={slides.length}
          slideBasis={slideBasis}
          trackRef={trackRef}
          trackSx={trackSx}
          touchHandlers={touchHandlers}
          variant="contained"
        >
          {slides.map((slide, i) => {
            const dist = Math.abs(i - idx);
            const wrapDist = Math.min(dist, slides.length - dist);
            const eager = wrapDist <= 1;
            return (
              <BannerSlideCard
                key={slide.id}
                href={slideHref(slide)}
                suppressNavRef={suppressNavRef}
                imageUrl={slide.imageUrl}
                fallbackBg={BANNER_SLIDE_VISUALS[i % BANNER_SLIDE_VISUALS.length].bg}
                eager={eager}
                priority={i === 0}
                title={slide.title}
                hideTitleWhenImage
                bordered
              />
            );
          })}
        </BannerSliderViewport>

        <BannerSliderPager
          slideCount={slides.length}
          idx={idx}
          autoplay={autoplay}
          goToSlide={goToSlide}
          toggleAutoplay={toggleAutoplay}
          tablistLabel={t.home.bannerSlidesAria}
          pauseLabel={t.home.bannerPause}
          playLabel={t.home.bannerPlay}
          slideLabel={(i) => t.home.bannerN(i + 1)}
        />
      </Stack>
    </Box>
  );
}
