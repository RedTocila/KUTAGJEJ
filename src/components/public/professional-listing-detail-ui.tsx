'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';

const FONT_CAPTION = '0.75rem';
const FONT_BODY = '0.875rem';

export function ProfessionalVerifiedBadge() {
  return (
    <Box
      aria-label="Profesionist i verifikuar"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: 26,
        height: 26,
        borderRadius: 1.25,
        bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
        border: '1px solid',
        borderColor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.35)',
      }}
    >
      <ShieldCheckIcon size={18} weight="fill" color="var(--mui-palette-primary-main)" aria-hidden />
    </Box>
  );
}

/** Compact rating chip — matches profile header mockup (dark box, score + count). */
export function ProfessionalRatingBadge({
  rating,
  reviewCount,
}: {
  rating: string;
  reviewCount: number;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.35,
        flexShrink: 0,
        minWidth: 72,
        px: 1.25,
        py: 0.85,
        borderRadius: 2.5,
        bgcolor: 'rgba(0, 0, 0, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        textAlign: 'center',
      }}
    >
      <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <StarIcon size={14} weight="fill" color="var(--mui-palette-primary-main)" aria-hidden />
        <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, lineHeight: 1, color: '#fff' }}>
          {rating}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontSize: '0.625rem',
          fontWeight: 600,
          lineHeight: 1.15,
          color: 'rgba(255, 255, 255, 0.55)',
          whiteSpace: 'nowrap',
        }}
      >
        ({reviewCount} vlerësime)
      </Typography>
    </Box>
  );
}

export function ProfessionalReviewsSectionHeader({
  rating,
  reviewCount,
}: {
  rating: string;
  reviewCount: number;
}) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Vlerësimet</Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <StarIcon size={16} weight="fill" color="var(--mui-palette-primary-main)" aria-hidden />
        <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, lineHeight: 1 }}>{rating}</Typography>
        <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', fontWeight: 600 }}>
          ({reviewCount} vlerësime)
        </Typography>
      </Stack>
    </Stack>
  );
}
