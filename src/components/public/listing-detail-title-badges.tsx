'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { ListingVerifiedBadge } from '@/components/public/professional-listing-detail-ui';

/** Inline badges after an h1 listing title on detail pages. */
export function ListingDetailTitleBadges({
  verified = false,
  verifiedLabel = 'Shitës i verifikuar',
  size = 22,
}: {
  verified?: boolean;
  verifiedLabel?: string;
  size?: number;
}) {
  if (!verified) return null;
  return (
    <>
      {verified ? (
        <Box
          component="span"
          sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
        >
          <ListingVerifiedBadge size={size} aria-label={verifiedLabel} />
        </Box>
      ) : null}
    </>
  );
}
