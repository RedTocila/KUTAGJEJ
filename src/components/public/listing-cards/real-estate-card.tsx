'use client';

import * as React from 'react';
import Link from 'next/link';
import BathtubOutlined from '@mui/icons-material/BathtubOutlined';
import BedOutlined from '@mui/icons-material/BedOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ChairOutlined from '@mui/icons-material/ChairOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import HouseOutlined from '@mui/icons-material/HouseOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import StairsOutlined from '@mui/icons-material/StairsOutlined';
import SquareFootOutlined from '@mui/icons-material/SquareFootOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { Box, Stack, Typography } from '@mui/material';

import type { PublicRealEstateListing } from '@/lib/public-listings-client';
import { propertyCategoryLabel } from '@/lib/real-estate-constants';
import { listingRealEstatePublicHref } from '@/paths';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { formatPrice, pseudoRandomMetric, relativeAlbanianDate } from './format-helpers';
import { SpecRow, type Spec } from './spec-row';

const FURNISHING_LABEL: Record<string, string> = {
  furnished: 'I mobiluar',
  unfurnished: 'Pa mobilim',
  'partially-furnished': 'Pjesërisht i mobiluar',
  'kitchen-only': 'Vetëm kuzhinë',
};

const iconSm = { fontSize: 14 } as const;
const iconFeatured = { fontSize: 17 } as const;

export function RealEstateCard({
  listing,
  variant = 'default',
}: {
  listing: PublicRealEstateListing;
  /** Hero grid on homepage — image gradient footer (price/title/location), spec row below. */
  variant?: 'default' | 'featured';
}) {
  const location = [listing.zoneName, listing.cityName].filter(Boolean).join(', ');
  const transactionLabel = listing.transactionType === 'rent' ? 'Me qira' : 'Në shitje';
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`re:${listing.id}:${listing.createdAt}`, 120, 9800),
    [listing.id, listing.createdAt],
  );

  const mediaHeight = variant === 'featured' ? 268 : 170;

  const specs: Spec[] =
    variant === 'featured'
      ? [
          ...(listing.bedrooms != null
            ? [{ icon: <BedOutlined sx={iconFeatured} />, label: `${listing.bedrooms} Dhoma gjumi`, title: 'Dhoma gjumi' }]
            : []),
          ...(listing.bathrooms != null
            ? [{ icon: <BathtubOutlined sx={iconFeatured} />, label: `${listing.bathrooms} Tualet`, title: 'Tualet' }]
            : []),
          { icon: <SquareFootOutlined sx={iconFeatured} />, label: `${listing.surfaceM2} m²`, title: 'Sipërfaqe' },
        ]
      : [
          ...(listing.bedrooms != null
            ? [{ icon: <BedOutlined sx={iconSm} />, label: `${listing.bedrooms}`, title: 'Dhoma gjumi' }]
            : []),
          ...(listing.bathrooms != null
            ? [{ icon: <BathtubOutlined sx={iconSm} />, label: `${listing.bathrooms}`, title: 'Banjo' }]
            : []),
          { icon: <SquareFootOutlined sx={iconSm} />, label: `${listing.surfaceM2} m²`, title: 'Sipërfaqe' },
          ...(listing.floor != null
            ? [{ icon: <StairsOutlined sx={iconSm} />, label: `Kati ${listing.floor}`, title: 'Kati' }]
            : []),
          ...(listing.yearBuilt != null
            ? [{ icon: <CalendarTodayOutlined sx={iconSm} />, label: String(listing.yearBuilt), title: 'Viti i ndërtimit' }]
            : []),
          ...(listing.furnishing
            ? [
                {
                  icon: <ChairOutlined sx={iconSm} />,
                  label: FURNISHING_LABEL[listing.furnishing] ?? listing.furnishing,
                  title: 'Mobilim',
                },
              ]
            : []),
        ];

  const FallbackIcon = listing.propertyCategory === 'villa' ? HouseOutlined : HomeOutlined;

  const shellSx = variant === 'featured' ? { borderRadius: 3, '&:hover': { transform: 'translateY(-4px)' } } : undefined;

  const featuredImageFooter =
    variant === 'featured' ? (
      <Stack spacing={0.65}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'primary.main', lineHeight: 1.2 }}>
          {formatPrice(listing.price, listing.currency)}
          {listing.transactionType === 'rent' ? (
            <Typography
              component="span"
              sx={{
                ml: 0.5,
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.72)',
              }}
            >
              / muaj
            </Typography>
          ) : null}
        </Typography>
        <Typography
          component="h3"
          id={`listing-card-title-${listing.id}`}
          sx={{
            fontWeight: 700,
            fontSize: '1.06rem',
            lineHeight: 1.35,
            color: '#fff',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 1px 12px rgba(0,0,0,0.45)',
          }}
        >
          {listing.title}
        </Typography>
        {location ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'rgba(255,255,255,0.72)' }}>
            <LocationOnOutlined sx={{ fontSize: 17 }} />
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem' }}>
              {location}
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    ) : null;

  const body = (
    <>
      <CardMedia
        imageUrl={listing.imageUrl}
        FallbackIcon={FallbackIcon}
        alt={listing.title}
        topLeftBadge={transactionLabel}
        height={mediaHeight}
        bottomOverlay={featuredImageFooter}
        visualVariant={variant === 'featured' ? 'featured' : 'default'}
      />
      <Stack
        className="listing-card-body"
        spacing={variant === 'featured' ? 0 : 1}
        sx={{
          p: variant === 'featured' ? { xs: 1.75, sm: 2 } : { xs: 1.75, sm: 2 },
          pt: variant === 'featured' ? 1.75 : undefined,
        }}
      >
        {variant === 'featured' ? null : (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
          >
            {propertyCategoryLabel(listing.propertyCategory)}
          </Typography>
        )}

        {variant === 'featured' ? null : (
          <Typography
            component="h3"
            id={`listing-card-title-${listing.id}`}
            sx={{
              fontWeight: 700,
              fontSize: '0.95rem',
              lineHeight: 1.4,
              color: 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {listing.title}
          </Typography>
        )}

        {variant === 'default' ? (
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'primary.main', lineHeight: 1.2 }}>
            {formatPrice(listing.price, listing.currency)}
            {listing.transactionType === 'rent' ? (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500 }}>
                / muaj
              </Typography>
            ) : null}
          </Typography>
        ) : null}

        {variant === 'default' ? <CardDescription text={listing.description} /> : null}

        {variant === 'default' ? <Box sx={{ flex: 1 }} /> : null}

        <SpecRow specs={specs} variant={variant === 'featured' ? 'featured' : 'default'} />

        {variant === 'default' && location ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <LocationOnOutlined sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {location}
            </Typography>
          </Stack>
        ) : null}
        {variant === 'default' ? (
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.disabled">
              {relativeAlbanianDate(listing.createdAt)}
            </Typography>
            <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center', color: 'text.disabled' }}>
              <VisibilityOutlined sx={{ fontSize: 14 }} />
              <Typography variant="caption" color="text.disabled">
                {new Intl.NumberFormat('en-GB').format(viewCount)}
              </Typography>
            </Stack>
          </Stack>
        ) : null}
      </Stack>
    </>
  );

  return (
    <Link
      href={listingRealEstatePublicHref(listing)}
      style={{
        height: '100%',
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
      }}
      aria-labelledby={`listing-card-title-${listing.id}`}
    >
      <CardShell sx={shellSx}>{body}</CardShell>
    </Link>
  );
}
