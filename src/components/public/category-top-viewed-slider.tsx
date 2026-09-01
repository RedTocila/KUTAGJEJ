'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
} from '@/paths';
import type { HomeVerticalId } from '@/lib/home-categories';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
  PublicRealEstateListing,
  TopViewedListing,
} from '@/lib/public-listings-client';
import { jobListingCoverImageUrl } from '@/lib/job-listing-cover';
import { useBannerSlider } from '@/hooks/use-banner-slider';
import { useCopy } from '@/hooks/use-copy';
import { JobListingFallback } from '@/components/jobs/job-listing-fallback';
import { ListingCardRating } from '@/components/public/listing-cards/listing-card-rating';
import { BANNER_SLIDE_VISUALS, BannerSlideCard } from '@/components/public/banner-slide-card';
import { BannerSliderPager } from '@/components/public/banner-slider-pager';
import { BannerSliderViewport } from '@/components/public/banner-slider-viewport';
import { formatPrice } from '@/components/public/listing-cards/format-helpers';

const SLIDE_MS = 320;

type SlideModel = {
  id: string;
  title: string;
  subtitle: string | null;
  bottomRightLabel?: string | null;
  fallbackSalary?: string | null;
  fallbackLocation?: string | null;
  fallbackIndustry?: string | null;
  fallbackCityName?: string | null;
  fallbackZoneName?: string | null;
  fallbackMapsUrl?: string | null;
  fallbackLocationAddress?: string | null;
  fallbackLocationLat?: number | null;
  fallbackLocationLng?: number | null;
  imageUrl: string | null;
  href: string;
  ratingAverage?: number | null;
  reviewCount?: number;
};

function isRatingFeaturedVertical(verticalId: HomeVerticalId): boolean {
  return verticalId === 'businesses' || verticalId === 'professionals';
}

function toSlide(verticalId: HomeVerticalId, listing: TopViewedListing, perMonthLabel: string): SlideModel {
  switch (verticalId) {
    case 'real-estate': {
      const l = listing as PublicRealEstateListing;
      return {
        id: l.id,
        title: l.title,
        subtitle: formatPrice(l.price, l.currency) + (l.transactionType === 'rent' ? ` ${perMonthLabel}` : ''),
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
      const salaryLabel = l.salary != null ? `${formatPrice(l.salary, l.currency)} / muaj` : 'Pagë e diskutueshme';
      const locationLabel = [l.zoneName, l.cityName].filter(Boolean).join(', ') || null;
      return {
        id: l.id,
        title: l.title,
        subtitle: l.title || null,
        bottomRightLabel: [salaryLabel, locationLabel].filter(Boolean).join(' • '),
        fallbackSalary: salaryLabel,
        fallbackLocation: locationLabel,
        fallbackIndustry: l.industry,
        fallbackCityName: l.cityName,
        fallbackZoneName: l.zoneName ?? null,
        fallbackMapsUrl: l.mapsUrl ?? null,
        fallbackLocationAddress: l.locationAddress ?? null,
        fallbackLocationLat: l.locationLat ?? null,
        fallbackLocationLng: l.locationLng ?? null,
        imageUrl: jobListingCoverImageUrl(l),
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
        subtitle: l.categoryLabel || l.cityName || null,
        imageUrl: l.imageUrl,
        href: listingBusinessPublicHref(l),
        ratingAverage: l.ratingAverage,
        reviewCount: l.reviewCount ?? 0,
      };
    }
    case 'professionals': {
      const l = listing as PublicDirectoryListing;
      return {
        id: l.id,
        title: l.title,
        subtitle: l.categoryLabel || l.cityName || null,
        imageUrl: l.imageUrl,
        href: listingProfessionalPublicHref(l),
        ratingAverage: l.ratingAverage,
        reviewCount: l.reviewCount ?? 0,
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
    () => listings.map((listing) => toSlide(verticalId, listing, t.browse.perMonth)),
    [listings, t.browse.perMonth, verticalId]
  );

  const { idx, slideBasis, trackRef, suppressNavRef, goToSlide, autoplay, toggleAutoplay, touchHandlers, trackSx } =
    useBannerSlider({
      slideCount: slides.length,
      slideMs: SLIDE_MS,
    });

  if (slides.length === 0) return null;

  return (
    <Box
      component="section"
      aria-label={byRating ? t.browse.highestRatedAria : t.browse.mostViewedAria}
      sx={{
        pt: 0,
        pb: 0,
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
            mb: { xs: 0.5, md: 0.75 },
          }}
        >
          {byRating ? t.browse.highestRated : t.browse.mostViewed}
        </Typography>

        <Stack spacing={0.5} sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
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
              const isJobMockupSlide = verticalId === 'jobs' && !slide.imageUrl;
              return (
                <BannerSlideCard
                  key={slide.id}
                  href={slide.href}
                  suppressNavRef={suppressNavRef}
                  imageUrl={slide.imageUrl}
                  fallbackContent={
                    isJobMockupSlide ? (
                      <JobListingFallback
                        title={slide.title}
                        industry={slide.fallbackIndustry}
                        cityName={slide.fallbackCityName}
                        zoneName={slide.fallbackZoneName}
                        mapsUrl={slide.fallbackMapsUrl}
                        locationAddress={slide.fallbackLocationAddress}
                        locationLat={slide.fallbackLocationLat}
                        locationLng={slide.fallbackLocationLng}
                      />
                    ) : undefined
                  }
                  fallbackBg={BANNER_SLIDE_VISUALS[i % BANNER_SLIDE_VISUALS.length].bg}
                  eager={eager}
                  title={slide.title}
                  topRightLabel={(listings[i]?.viewCount ?? 0).toLocaleString('en-GB')}
                  bottomLeftLabel={isJobMockupSlide ? slide.title : byRating ? null : slide.subtitle}
                  bottomRightLabel={
                    verticalId === 'jobs'
                      ? null
                      : byRating &&
                          slide.ratingAverage != null &&
                          Number.isFinite(slide.ratingAverage) &&
                          (slide.reviewCount ?? 0) > 0
                        ? (
                            <ListingCardRating
                              ratingAverage={slide.ratingAverage}
                              reviewCount={slide.reviewCount ?? 0}
                              singleStar
                              onMedia
                            />
                          )
                        : slide.bottomRightLabel
                  }
                  showNavigationArrow={false}
                  contentPlacement="below"
                  inlineImageFooter={byRating}
                  hideTitleBelowImage
                  titleMaxLines={1}
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
