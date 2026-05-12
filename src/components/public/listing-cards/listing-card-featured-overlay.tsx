'use client';

import * as React from 'react';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import { Box, Stack, Typography } from '@mui/material';

/** Price + title + optional location on the image gradient (homepage featured grids). */
export function ListingCardFeaturedImageFooter(props: {
  listingId: string;
  priceLine: React.ReactNode;
  title: string;
  /** e.g. `Tiranë` or `Tiranë, Shqipëri` */
  locationLine?: string | null;
}) {
  const { listingId, priceLine, title, locationLine } = props;
  return (
    <Stack spacing={0.65}>
      <Box sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'primary.main', lineHeight: 1.2 }}>{priceLine}</Box>
      <Typography
        component="h3"
        id={`listing-card-title-${listingId}`}
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
        {title}
      </Typography>
      {locationLine ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'rgba(255,255,255,0.72)' }}>
          <LocationOnOutlined sx={{ fontSize: 17 }} />
          <Typography variant="caption" sx={{ fontWeight: 500, color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem' }}>
            {locationLine}
          </Typography>
        </Stack>
      ) : null}
    </Stack>
  );
}
