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
import { SpecRow, type Spec } from './spec-row';

const iconSm = { fontSize: 14 } as const;

function conditionIconNode(condition: string | null) {
  if (condition === 'i-ri' || condition === 'si-i-ri') return <AutoAwesomeOutlined sx={iconSm} />;
  return <CheckCircleOutlineOutlined sx={iconSm} />;
}

export function MarketplaceCard({ listing }: { listing: PublicMarketplaceListing }) {
  const viewCount = React.useMemo(
    () => pseudoRandomMetric(`mk:${listing.id}:${listing.createdAt}`, 120, 9800),
    [listing.id, listing.createdAt],
  );
  const categoryLabel = findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, listing.category);
  const conditionLabel = listing.condition ? findOptionLabel(MARKETPLACE_CONDITION_OPTIONS, listing.condition) : null;

  const specs: Spec[] = [
    { icon: <LabelOutlined sx={iconSm} />, label: categoryLabel, title: 'Kategoria' },
    ...(conditionLabel ? [{ icon: conditionIconNode(listing.condition), label: conditionLabel, title: 'Gjendja' }] : []),
  ];

  return (
    <Link
      href={listingMarketplacePublicHref(listing)}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      <CardShell>
        <CardMedia
          imageUrl={listing.imageUrl}
          FallbackIcon={ShoppingBagOutlined}
          alt={listing.title}
          topLeftBadge={conditionLabel ?? undefined}
        />
        <Stack className="listing-card-body" spacing={1} sx={{ p: { xs: 1.75, sm: 2 } }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
          >
            {categoryLabel}
          </Typography>
          <Typography
            component="h3"
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
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'primary.main', lineHeight: 1.2 }}>
            {formatPrice(listing.price, listing.currency)}
          </Typography>

          <CardDescription text={listing.description} />

          <Box sx={{ flex: 1 }} />

          <SpecRow specs={specs} />

          {listing.cityName ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <LocationOnOutlined sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {listing.cityName}
              </Typography>
            </Stack>
          ) : null}
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
        </Stack>
      </CardShell>
    </Link>
  );
}
