'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';

import { ProfessionalRatingSummary } from '@/components/public/professional-listing-detail-ui';
import { formatRatingDisplay } from '@/lib/format-rating';

export type ListingCardRatingSummary = {
  ratingAverage?: number | null;
  reviewCount?: number;
};

/** Compact rating row for listing cards (number left of stars). */
export function ListingCardRating({
  ratingAverage,
  reviewCount,
  showWhenEmpty = false,
  singleStar = false,
}: ListingCardRatingSummary & { showWhenEmpty?: boolean; singleStar?: boolean }) {
  const count = reviewCount ?? 0;
  if (
    !showWhenEmpty &&
    count <= 0 &&
    (ratingAverage == null || !Number.isFinite(ratingAverage))
  ) {
    return null;
  }

  const rating =
    count > 0 && ratingAverage != null && Number.isFinite(ratingAverage)
      ? formatRatingDisplay(ratingAverage)
      : formatRatingDisplay(0);

  if (singleStar) {
    return (
      <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, lineHeight: 1.25 }}>{rating}</Typography>
        <StarIcon size={18} weight="fill" color="var(--mui-palette-warning-main)" aria-hidden />
      </Stack>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <ProfessionalRatingSummary rating={rating} reviewCount={count} starSize={18} />
    </Box>
  );
}

/** Prefer a listing's own rating; otherwise fall back to seller/profile rating. */
export function resolveListingCardRating(
  listing: ListingCardRatingSummary | null | undefined,
  seller?: ListingCardRatingSummary | null,
): ListingCardRatingSummary | null {
  const listingCount = listing?.reviewCount ?? 0;
  if (listingCount > 0 || (listing?.ratingAverage != null && Number.isFinite(listing.ratingAverage))) {
    return {
      ratingAverage: listing?.ratingAverage ?? null,
      reviewCount: listingCount,
    };
  }
  const sellerCount = seller?.reviewCount ?? 0;
  if (sellerCount > 0 || (seller?.ratingAverage != null && Number.isFinite(seller.ratingAverage))) {
    return {
      ratingAverage: seller?.ratingAverage ?? null,
      reviewCount: sellerCount,
    };
  }
  return null;
}
