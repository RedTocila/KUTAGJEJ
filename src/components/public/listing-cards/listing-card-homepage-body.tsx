'use client';

import * as React from 'react';
import { Stack, Typography } from '@mui/material';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { ListingPrice } from './listing-price';
import { ListingTitleWithVerified } from './listing-title-with-verified';
import { listingCardRelativeDate } from './format-helpers';
import { SpecRow, type Spec } from './spec-row';

export function CardLocationInline({
  location,
  iconSize = 14,
}: {
  location?: string | null;
  iconSize?: number;
}) {
  if (!location?.trim()) return null;

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: 'center', color: 'text.secondary', minWidth: 0, maxWidth: '52%', flexShrink: 1 }}
    >
      <MapPinIcon size={iconSize} weight="regular" color="var(--mui-palette-primary-main)" />
      <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 500, minWidth: 0 }}>
        {location.trim()}
      </Typography>
    </Stack>
  );
}

export function CardPostedViewsRow({
  listing,
  viewCount,
}: {
  listing: { bumpedAt?: string | null; createdAt: string };
  viewCount: number;
}) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
      <Typography variant="caption" color="text.disabled" noWrap sx={{ minWidth: 0 }}>
        {listingCardRelativeDate(listing)}
      </Typography>
      <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center', color: 'text.disabled', flexShrink: 0 }}>
        <EyeIcon size={14} weight="regular" />
        <Typography variant="caption" color="text.disabled">
          {new Intl.NumberFormat('en-GB').format(viewCount)}
        </Typography>
      </Stack>
    </Stack>
  );
}

/** Homepage / browse body — title, price (or custom leading) + location, specs, posted + views. */
export function ListingCardHomepageBody({
  title,
  titleId,
  titleTrailing,
  price,
  originalPrice,
  currency,
  priceSuffix,
  leading,
  location,
  specs = [],
  specsSlot,
  listing,
  viewCount,
  density = 'carousel',
}: {
  title: string;
  titleId?: string;
  /** Optional content on the right of the title (e.g. rating stars). */
  titleTrailing?: React.ReactNode;
  price?: number | null;
  originalPrice?: number | null;
  currency?: string | null;
  priceSuffix?: React.ReactNode;
  /** Replaces the price row (e.g. category / rating for directory cards). */
  leading?: React.ReactNode;
  location?: string | null;
  specs?: Spec[];
  /** Replaces SpecRow (e.g. open/closed status for business cards). */
  specsSlot?: React.ReactNode;
  listing: { bumpedAt?: string | null; createdAt: string };
  viewCount: number;
  /** `compact` matches cars/marketplace browse cards; `carousel` is for homepage rows. */
  density?: 'carousel' | 'compact';
}) {
  const isCompact = density === 'compact';

  return (
    <Stack
      className="listing-card-body"
      spacing={isCompact ? { xs: 0.25, sm: 0.4 } : { xs: 0.45, sm: 0.55 }}
      sx={
        isCompact
          ? { pt: { xs: 0.65, sm: 0.8 }, px: { xs: 0.25, sm: 0.4 }, pb: { xs: 0.8, sm: 1 } }
          : { pt: { xs: 0.75, sm: 0.85 }, px: { xs: 0.25, sm: 0.4 }, pb: { xs: 0.85, sm: 1 } }
      }
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 0.75, minWidth: 0 }}>
        <ListingTitleWithVerified
          id={titleId}
          title={title}
          maxLines={1}
          verified={false}
          sx={titleTrailing ? { width: 'auto', flex: 1, minWidth: 0 } : undefined}
          typographySx={
            isCompact
              ? {
                  fontSize: { xs: '0.76rem', sm: '0.82rem' },
                  fontWeight: 650,
                  lineHeight: 1.25,
                }
              : {
                  fontSize: { xs: '0.8rem', sm: '0.86rem' },
                  fontWeight: 650,
                  lineHeight: 1.25,
                }
          }
        />
        {titleTrailing}
      </Stack>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}>
        {leading !== undefined ? (
          <Stack direction="row" sx={{ alignItems: 'center', minWidth: 0, flex: '1 1 auto', gap: 0.75 }}>
            {leading}
          </Stack>
        ) : (
          <ListingPrice
            price={price}
            originalPrice={originalPrice}
            currency={currency}
            fontSize={isCompact ? '0.9rem' : '0.92rem'}
            fontWeight={800}
            suffix={priceSuffix}
            sx={{ minWidth: 0, flex: '1 1 auto' }}
          />
        )}
        <CardLocationInline location={location} />
      </Stack>

      {specsSlot != null ? specsSlot : <SpecRow specs={specs} />}

      <CardPostedViewsRow listing={listing} viewCount={viewCount} />
    </Stack>
  );
}
