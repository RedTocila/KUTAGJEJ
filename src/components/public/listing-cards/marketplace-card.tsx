'use client';

import * as React from 'react';
import Link from 'next/link';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import LabelOutlined from '@mui/icons-material/LabelOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { Box, Stack, Typography } from '@mui/material';

import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import type { PublicMarketplaceListing } from '@/lib/public-listings-client';
import { listingMarketplacePublicHref } from '@/paths';

import { CardDescription } from './card-description';
import { CardMedia } from './card-media';
import { CardShell } from './card-shell';
import { findOptionLabel, formatPrice, pseudoRandomMetric, relativeAlbanianDate } from './format-helpers';
import { ListingCardFeaturedImageFooter } from './listing-card-featured-overlay';
import { SpecRow, type Spec } from './spec-row';

const iconSm = { fontSize: 14 } as const;
const iconFeatured = { fontSize: 17 } as const;

function conditionIconNode(condition: string | null, size: 'sm' | 'feat') {
  const sx = size === 'feat' ? iconFeatured : iconSm;
  if (condition === 'i-ri' || condition === 'si-i-ri') return <AutoAwesomeOutlined sx={sx} />;
  return <CheckCircleOutlineOutlined sx={sx} />;
}

export function MarketplaceCard({
  listing,
  variant = 'default',
}: {
  listing: PublicMarketplaceListing;
  variant?: 'default' | 'featured';
}) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`mk:${listing.id}:${listing.createdAt}`, 120, 9800),
    [listing.id, listing.createdAt],
  );
  const categoryLabel = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, listing.category);
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;

  const locationLine = listing.cityName ? `${listing.cityName}, Shqipëri` : null;

  const specs: Spec[] =
    variant === 'featured'
      ? [
          { icon: <LabelOutlined sx={iconFeatured} />, label: categoryLabel, title: 'Kategoria' },
          ...(conditionLabel
            ? [{ icon: conditionIconNode(listing.condition, 'feat'), label: conditionLabel, title: 'Gjendja' }]
            : [{ icon: <ShoppingBagOutlined sx={iconFeatured} />, label: 'Tregu', title: 'Kategori' }]),
        ]
      : [
          { icon: <LabelOutlined sx={iconSm} />, label: categoryLabel, title: 'Kategoria' },
          ...(conditionLabel ? [{ icon: conditionIconNode(listing.condition, 'sm'), label: conditionLabel, title: 'Gjendja' }] : []),
        ];

  const mediaHeight = variant === 'featured' ? 268 : 170;
  const shellSx = variant === 'featured' ? { borderRadius: 3, '&:hover': { transform: 'translateY(-4px)' } } : undefined;

  const priceFeatured =
    listing.price != null ? formatPrice(listing.price, listing.currency) : 'Çmim me marrëveshje';

  const featuredImageFooter =
    variant === 'featured' ? (
      <ListingCardFeaturedImageFooter
        listingId={listing.id}
        priceLine={priceFeatured}
        title={listing.title}
        locationLine={locationLine}
      />
    ) : null;

  return (
    <Link
      href={listingMarketplacePublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
      aria-labelledby={`listing-card-title-${listing.id}`}
    >
      <CardShell sx={shellSx}>
        <CardMedia
          imageUrl={listing.imageUrl}
          FallbackIcon={ShoppingBagOutlined}
          alt={listing.title}
          topLeftBadge={conditionLabel ?? undefined}
          height={mediaHeight}
          bottomOverlay={featuredImageFooter}
          visualVariant={variant === 'featured' ? 'featured' : 'default'}
        />
        <Stack
          className="listing-card-body"
          spacing={variant === 'featured' ? 0 : 1}
          sx={{
            p: { xs: 1.75, sm: 2 },
            pt: variant === 'featured' ? 1.75 : undefined,
          }}
        >
          {variant === 'featured' ? null : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
            >
              {categoryLabel}
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
              {listing.price != null ? formatPrice(listing.price, listing.currency) : 'Çmim me marrëveshje'}
            </Typography>
          ) : null}
          {variant === 'default' ? <CardDescription text={listing.description} /> : null}
          {variant === 'default' ? <Box sx={{ flex: 1 }} /> : null}
          <SpecRow specs={specs} variant={variant === 'featured' ? 'featured' : 'default'} />
          {variant === 'default' && listing.cityName ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <LocationOnOutlined sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {listing.cityName}
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
      </CardShell>
    </Link>
  );
}
