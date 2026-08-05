'use client';

import * as React from 'react';
import { Box } from '@mui/material';

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
}: ListingCardRatingSummary & { showWhenEmpty?: boolean }) {
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

  return (
    <Box sx={{ minWidth: 0 }}>
      <ProfessionalRatingSummary rating={rating} reviewCount={count} starSize={13} />
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
