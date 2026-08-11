'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

import { BannerSlideCard, BANNER_SLIDE_VISUALS } from '@/components/public/banner-slide-card';
import { BannerSliderPager } from '@/components/public/banner-slider-pager';
import { BannerSliderViewport } from '@/components/public/banner-slider-viewport';
import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { useBannerSlider } from '@/hooks/use-banner-slider';
import { useCopy } from '@/hooks/use-copy';
import { formatRatingDisplay } from '@/lib/format-rating';
import type { HomeVerticalId } from '@/lib/home-categories';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
  PublicRealEstateListing,
  TopViewedListing,
} from '@/lib/public-listings-client';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
} from '@/paths';

const SLIDE_MS = 320;

type SlideModel = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  href: string;
};

function isRatingFeaturedVertical(verticalId: HomeVerticalId): boolean {
  return verticalId === 'businesses' || verticalId === 'professionals';
}

function directoryRatingSubtitle(listing: PublicDirectoryListing): string | null {
  const count = listing.reviewCount ?? 0;
  const avg = listing.ratingAverage;
  if (count > 0 && avg != null && Number.isFinite(avg)) {
    return `${formatRatingDisplay(avg)} ★`;
  }
  return listing.categoryLabel || listing.cityName || null;
}

function toSlide(verticalId: HomeVerticalId, listing: TopViewedListing): SlideModel {
  switch (verticalId) {
    case 'real-estate': {
      const l = listing as PublicRealEstateListing;
      return {
        id: l.id,
        title: l.title,
        subtitle: formatPrice(l.price, l.currency),
        imageUrl: l.imageUrl,
        href: listingRealEstatePublicHref(l),
      };
    }
    case 'cars': {
      const l = listing as PublicCarListing;
      const title = [l.make, l.model, l.variant].filter(Boolean).join(' ');
      return {
        id: l.id,
        title,
        subtitle: formatPrice(l.price, l.currency),
        imageUrl: l.imageUrl,
        href: listingCarPublicHref(l),
      };
    }
    case 'jobs': {
      const l = listing as PublicJobListing;
      return {
        id: l.id,
        title: l.title,
        subtitle: l.salary != null ? formatPrice(l.salary, l.currency) : (l.cityName ?? null),
        imageUrl: l.imageUrl,
        href: listingJobPublicHref(l),
      };
    }
    case 'marketplace': {
      const l = listing as PublicMarketplaceListing;
      return {
        id: l.id,
        title: l.title,
        subtitle: formatPrice(l.price, l.currency),
        imageUrl: l.imageUrl,
        href: listingMarketplacePublicHref(l),
      };
    }
    case 'businesses': {
      const l = listing as PublicDirectoryListing;
      return {
        id: l.id,
        title: l.title,
        subtitle: directoryRatingSubtitle(l),
        imageUrl: l.imageUrl,
        href: listingBusinessPublicHref(l),
      };
    }
    case 'professionals': {
      const l = listing as PublicDirectoryListing;
      return {
        id: l.id,
        title: l.title,
        subtitle: directoryRatingSubtitle(l),
        imageUrl: l.imageUrl,
        href: listingProfessionalPublicHref(l),
      };
    }
    default:
      return {
        id: listing.id,
        title: 'Njoftim',
        subtitle: null,
        imageUrl: null,
        href: '/',
      };
  }
}

/**
 * Contained banner slider for the most-viewed listings on a category page —
 * same chrome as the home promo banners.
 */
export function CategoryTopViewedSlider({
  verticalId,
  listings,
}: {
  verticalId: HomeVerticalId;
  listings: TopViewedListing[];
}) {
  const t = useCopy();
  const byRating = isRatingFeaturedVertical(verticalId);
  const slides = React.useMemo(
    () => listings.map((listing) => toSlide(verticalId, listing)),
    [listings, verticalId],
  );

  const {
    idx,
    slideBasis,
    trackRef,
    suppressNavRef,
    goToSlide,
    autoplay,
    toggleAutoplay,
    touchHandlers,
    trackSx,
  } = useBannerSlider({
    slideCount: slides.length,
    slideMs: SLIDE_MS,
  });

  if (slides.length === 0) return null;

  return (
    <Box
      component="section"
      aria-label={byRating ? t.browse.highestRatedAria : t.browse.mostViewedAria}
      sx={{
        pt: { xs: 2, md: 2.5 },
        pb: { xs: 0.25, md: 0.5 },
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <Container maxWidth="xl" sx={{ minWidth: 0, px: { xs: 2, md: 3, lg: 4 } }}>
        <Typography
          component="h2"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '0.95rem', md: '1.05rem' },
            letterSpacing: '-0.01em',
            mb: { xs: 1, md: 1.25 },
          }}
        >
          {byRating ? t.browse.highestRated : t.browse.mostViewed}
        </Typography>

        <Stack spacing={1.35} sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
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
                  href={slide.href}
                  suppressNavRef={suppressNavRef}
                  imageUrl={slide.imageUrl}
                  fallbackBg={BANNER_SLIDE_VISUALS[i % BANNER_SLIDE_VISUALS.length].bg}
                  eager={eager}
                  title={slide.title}
                  subtitle={slide.subtitle}
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
            tablistLabel={t.browse.listingSlidesAria}
            pauseLabel={t.browse.slidesPause}
            playLabel={t.browse.slidesPlay}
            slideLabel={(i) => t.browse.slideN(i + 1)}
          />
        </Stack>
      </Container>
    </Box>
  );
}
