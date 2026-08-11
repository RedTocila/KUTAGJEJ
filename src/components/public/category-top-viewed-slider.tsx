'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Container, Stack, Typography } from '@mui/material';
import { ArrowUpRight as ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';

import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { useBannerSlider } from '@/hooks/use-banner-slider';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
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
import { MOTION } from '@/styles/motion';

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

function ListingSlidePanel({
  slide,
  suppressNavRef,
}: {
  slide: SlideModel;
  suppressNavRef: React.MutableRefObject<boolean>;
}) {
  const imageBg = slide.imageUrl && /^https?:\/\//i.test(slide.imageUrl) ? slide.imageUrl : null;

  const content = (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: { xs: 240, sm: 260 },
        overflow: 'hidden',
        bgcolor: imageBg ? 'grey.900' : primaryMainAlpha(0.14),
        backgroundImage: imageBg ? `url(${imageBg})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: `transform ${MOTION.fast} ${MOTION.ease}, filter ${MOTION.fast} ${MOTION.ease}`,
        '&:hover': { filter: 'brightness(1.03)' },
        '&:active': { transform: 'scale(0.992)' },
      }}
    >
      {/* Light top dim + bottom fade so the title stays readable */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: imageBg
            ? 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 45%, rgba(0,0,0,0) 62%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 55%)',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '55%',
          pointerEvents: 'none',
          zIndex: 0,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 42%, rgba(0,0,0,0) 100%)',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          p: { xs: 2.25, sm: 2.75 },
          minHeight: { xs: 240, sm: 260 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {slide.subtitle ? (
          <Box
            sx={{
              alignSelf: 'flex-end',
              px: 1.25,
              py: 0.55,
              borderRadius: 1.5,
              bgcolor: 'rgba(0,0,0,0.42)',
              border: '1px solid rgba(255,255,255,0.16)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.22)',
              maxWidth: '72%',
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '0.9rem', sm: '1rem' },
                color: 'primary.main',
                textAlign: 'right',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {slide.subtitle}
            </Typography>
          </Box>
        ) : (
          <Box />
        )}

        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            component="h3"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              textAlign: 'left',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.45), 0 2px 16px rgba(0,0,0,0.35)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: '88%',
              flex: 1,
              minWidth: 0,
            }}
          >
            {slide.title}
          </Typography>

          <Box
            aria-hidden
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(0,0,0,0.42)',
              border: '1px solid rgba(255,255,255,0.16)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.22)',
              color: '#fff',
              mb: 0.25,
            }}
          >
            <ArrowUpRightIcon size={18} weight="bold" />
          </Box>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box
      component={RouterLink}
      href={slide.href}
      onClick={(event: React.MouseEvent) => {
        if (suppressNavRef.current) {
          event.preventDefault();
          suppressNavRef.current = false;
        }
      }}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {content}
    </Box>
  );
}

/**
 * Homepage-style banner slider for the most-viewed listings on a category page —
 * image + title/price only (no full listing card chrome).
 */
export function CategoryTopViewedSlider({
  verticalId,
  listings,
}: {
  verticalId: HomeVerticalId;
  listings: TopViewedListing[];
}) {
  const byRating = isRatingFeaturedVertical(verticalId);
  const slides = React.useMemo(
    () => listings.map((listing) => toSlide(verticalId, listing)),
    [listings, verticalId],
  );

  const { idx, slideBasis, trackRef, suppressNavRef, goToSlide, touchHandlers, trackSx } =
    useBannerSlider({
      slideCount: slides.length,
      slideMs: SLIDE_MS,
    });

  if (slides.length === 0) return null;

  return (
    <Box
      component="section"
      aria-label={byRating ? 'Njoftimet më të vlerësuara' : 'Njoftimet më të shikuara'}
      sx={{
        py: { xs: 2, md: 2.5 },
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'hidden',
      }}
    >
      <Container maxWidth="xl" sx={{ minWidth: 0 }}>
        <Typography
          component="h2"
          sx={{
            fontWeight: 700,
            fontSize: { xs: '0.95rem', md: '1.05rem' },
            letterSpacing: '-0.01em',
            mb: { xs: 1, md: 1.25 },
          }}
        >
          {byRating ? 'Më të vlerësuarat' : 'Më të shikuarat'}
        </Typography>

        <Stack spacing={1.35} sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <Box
            {...touchHandlers}
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              // Flex min-content would otherwise expand to the full N× track width
              // and push the document into horizontal page scroll.
              minWidth: 0,
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: (theme) =>
                theme.palette.mode === 'light'
                  ? '0 8px 24px rgba(0,0,0,0.1)'
                  : '0 10px 28px rgba(0,0,0,0.18)',
              touchAction: 'pan-y',
              overscrollBehaviorX: 'none',
              cursor: slides.length > 1 ? 'grab' : undefined,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <Box
              ref={trackRef}
              sx={{
                ...trackSx,
                maxWidth: 'none',
              }}
            >
              {slides.map((slide) => (
                <Box key={slide.id} sx={{ flex: `0 0 ${slideBasis}%`, minWidth: 0, maxWidth: `${slideBasis}%` }}>
                  <ListingSlidePanel slide={slide} suppressNavRef={suppressNavRef} />
                </Box>
              ))}
            </Box>
          </Box>

          {slides.length > 1 ? (
            <Stack
              direction="row"
              spacing={0.8}
              role="tablist"
              aria-label="Slidet e njoftimeve"
              sx={{ justifyContent: 'center', pt: 0.15 }}
            >
              {slides.map((slide, i) => (
                <Box
                  key={slide.id}
                  component="button"
                  type="button"
                  role="tab"
                  aria-selected={i === idx}
                  aria-label={`Njoftimi ${i + 1}`}
                  onClick={() => goToSlide(i)}
                  sx={{
                    width: i === idx ? 22 : 8,
                    height: 8,
                    borderRadius: 99,
                    border: 0,
                    p: 0,
                    cursor: 'pointer',
                    transition: `width ${MOTION.fast} ${MOTION.ease}, background-color ${MOTION.fast} ${MOTION.ease}`,
                    bgcolor: i === idx ? 'primary.main' : 'action.selected',
                    '&:hover': {
                      bgcolor: i === idx ? 'primary.dark' : 'action.active',
                    },
                  }}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
