'use client';

import * as React from 'react';
import { alpha, Box, Chip, Stack } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

export interface CardMediaProps {
  /** Primary image to render — `null` falls back to a tinted icon panel. */
  imageUrl: string | null;
  /** Phosphor icon used in the fallback panel. */
  FallbackIcon: PhosphorIcon;
  /** Alt text for the image. Empty alts are allowed for decorative covers. */
  alt: string;
  /** Optional small chip rendered top-left over the media (e.g. "Me qira"). */
  topLeftBadge?: string;
  /** Optional small chip rendered top-right over the media (e.g. "I ri"). */
  topRightBadge?: string;
  /** Cover height — desktop default is 170px. */
  height?: number;
}

/**
 * Shared media slot for the public listing cards. Shows the listing's first
 * photo when available and falls back to a quiet, theme-aware icon panel
 * otherwise. Optional top badges let each card surface its key fact (e.g.
 * "Me qira", "I ri") without competing with the typography below.
 */
export function CardMedia({
  imageUrl,
  FallbackIcon,
  alt,
  topLeftBadge,
  topRightBadge,
  height = 170,
}: CardMediaProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        height,
        flexShrink: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
        overflow: 'hidden',
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <Stack
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            opacity: 0.55,
          }}
        >
          <FallbackIcon size={42} weight="duotone" />
        </Stack>
      )}

      {topLeftBadge ? (
        <Chip
          label={topLeftBadge}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: 'rgb(var(--mui-palette-background-paperChannel) / 0.92)',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            '& .MuiChip-label': { px: 1 },
          }}
        />
      ) : null}

      {topRightBadge ? (
        <Chip
          label={topRightBadge}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            height: 22,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '& .MuiChip-label': { px: 1 },
          }}
        />
      ) : null}
    </Box>
  );
}
