'use client';

import * as React from 'react';
import Favorite from '@mui/icons-material/Favorite';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import { Box, Chip, IconButton, Stack } from '@mui/material';
import type { SvgIconProps } from '@mui/material/SvgIcon';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

export interface CardMediaProps {
  imageUrl: string | null;
  FallbackIcon: React.ElementType<SvgIconProps>;
  alt: string;
  topLeftBadge?: string;
  topRightBadge?: string;
  height?: number;
  /** Content pinned to the bottom of the image (e.g. price + title) inside a dark gradient. */
  bottomOverlay?: React.ReactNode;
  /**
   * `featured` — favorite control reads on photos (translucent), no divider under media.
   */
  visualVariant?: 'default' | 'featured';
}

export function CardMedia({
  imageUrl,
  FallbackIcon,
  alt,
  topLeftBadge,
  topRightBadge,
  height = 170,
  bottomOverlay,
  visualVariant = 'default',
}: CardMediaProps) {
  const [saved, setSaved] = React.useState(false);
  const isFeatured = visualVariant === 'featured';

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        flexShrink: 0,
        borderBottom: isFeatured ? 'none' : '1px solid',
        borderColor: 'divider',
        bgcolor: primaryMainAlpha(0.06),
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
          <FallbackIcon sx={{ fontSize: 42 }} />
        </Stack>
      )}

      {bottomOverlay ? (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            pt: 5,
            pb: 1.75,
            px: 2,
            pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 100%)',
          }}
        >
          {bottomOverlay}
        </Box>
      ) : null}

      {topLeftBadge ? (
        <Chip
          label={topLeftBadge}
          size="small"
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            height: 26,
            fontSize: '0.72rem',
            fontWeight: 700,
            bgcolor: 'rgba(0,0,0,0.55)',
            color: '#fff',
            border: 'none',
            zIndex: 2,
            '& .MuiChip-label': { px: 1.25 },
          }}
        />
      ) : null}

      {topRightBadge ? (
        <Chip
          label={topRightBadge}
          size="small"
          sx={{
            position: 'absolute',
            top: 10,
            right: isFeatured ? 48 : 52,
            height: 26,
            fontSize: '0.72rem',
            fontWeight: 700,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            zIndex: 2,
            '& .MuiChip-label': { px: 1 },
          }}
        />
      ) : null}

      <IconButton
        aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj njoftimin'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSaved((prev) => !prev);
        }}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          width: isFeatured ? 42 : 40,
          height: isFeatured ? 42 : 40,
          ...(isFeatured
            ? {
                bgcolor: 'rgba(0,0,0,0.28)',
                color: saved ? '#f87171' : '#fff',
                border: 'none',
                backdropFilter: 'blur(4px)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.42)' },
              }
            : {
                bgcolor: 'rgba(255,255,255,0.95)',
                color: saved ? 'error.main' : 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: '#fff' },
              }),
        }}
      >
        {saved ? <Favorite sx={{ fontSize: 22 }} /> : <FavoriteBorder sx={{ fontSize: 22 }} />}
      </IconButton>
    </Box>
  );
}
