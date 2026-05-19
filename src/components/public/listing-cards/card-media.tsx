'use client';

import * as React from 'react';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import { ListingMediaActionButton, pseudoRandomListingActionCount } from '@/components/public/listing-media-action-button';

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
  /** Rendered flush along the bottom edge of the image (e.g. promo ticker). */
  bottomOverlay?: React.ReactNode;
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
  bottomOverlay,
}: CardMediaProps) {
  const seed = `${imageUrl ?? ''}|${alt}|${topLeftBadge ?? ''}|${topRightBadge ?? ''}`;
  const baseSavedCount = React.useMemo(() => pseudoRandomListingActionCount(seed), [seed]);
  const shareCount = React.useMemo(() => pseudoRandomListingActionCount(`${seed}|share`), [seed]);
  const [saved, setSaved] = React.useState(false);
  const visibleSavedCount = saved ? baseSavedCount + 1 : baseSavedCount;

  const handleShare = React.useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ title: alt, text: alt, url: window.location.href });
          return;
        }
      } catch {
        /* noop */
      }
      try {
        if (typeof navigator !== 'undefined') {
          await navigator.clipboard.writeText(window.location.href);
        }
      } catch {
        /* noop */
      }
    },
    [alt],
  );

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        flexShrink: 0,
        borderBottom: '1px solid',
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

      {bottomOverlay ? (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2,
            pointerEvents: 'none',
            '& > *': { pointerEvents: 'auto' },
          }}
        >
          {bottomOverlay}
        </Box>
      ) : null}

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ position: 'absolute', top: 8, right: 8, alignItems: 'center', zIndex: 3 }}
      >
        <ListingMediaActionButton
          aria-label="Ndaj njoftimin"
          count={shareCount}
          icon={<ShareNetworkIcon size={17} weight="regular" />}
          onClick={handleShare}
        />
        <ListingMediaActionButton
          aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj njoftimin'}
          count={visibleSavedCount}
          active={saved}
          icon={<BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'regular'} />}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setSaved((prev) => !prev);
          }}
        />
      </Stack>
    </Box>
  );
}

