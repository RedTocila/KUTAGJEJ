'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Chip, Stack } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { useUser } from '@/hooks/use-user';
import {
  recordListingMetricEvent,
  toggleListingSave,
  type ListingMetricKind,
} from '@/lib/listing-metrics';
import { paths } from '@/paths';

export interface CardMediaProps {
  listingKind: ListingMetricKind;
  listingId: string;
  /** Primary image to render — `null` falls back to a tinted icon panel. */
  imageUrl: string | null;
  FallbackIcon: PhosphorIcon;
  alt: string;
  topLeftBadge?: string;
  topRightBadge?: string;
  height?: number;
  bottomOverlay?: React.ReactNode;
  shareCount?: number;
  saveCount?: number;
  saved?: boolean;
}

export function CardMedia({
  listingKind,
  listingId,
  imageUrl,
  FallbackIcon,
  alt,
  topLeftBadge,
  topRightBadge,
  height = 170,
  bottomOverlay,
  shareCount: initialShareCount = 0,
  saveCount: initialSaveCount = 0,
  saved: initialSaved,
}: CardMediaProps) {
  const router = useRouter();
  const { user } = useUser();
  const [shareCount, setShareCount] = React.useState(initialShareCount);
  const [saveCount, setSaveCount] = React.useState(initialSaveCount);
  const [saved, setSaved] = React.useState(Boolean(initialSaved));

  React.useEffect(() => {
    setShareCount(initialShareCount);
  }, [initialShareCount]);

  React.useEffect(() => {
    setSaveCount(initialSaveCount);
  }, [initialSaveCount]);

  React.useEffect(() => {
    if (initialSaved !== undefined) setSaved(initialSaved);
  }, [initialSaved]);

  const handleShare = React.useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ title: alt, text: alt, url: window.location.href });
        } else if (typeof navigator !== 'undefined') {
          await navigator.clipboard.writeText(window.location.href);
        }
      } catch {
        /* cancelled or blocked */
      }
      const metrics = await recordListingMetricEvent(listingKind, listingId, 'share');
      if (metrics) setShareCount(metrics.shareCount);
    },
    [alt, listingKind, listingId],
  );

  const handleSave = React.useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!user) {
        router.push(paths.user.auth);
        return;
      }
      const metrics = await toggleListingSave(listingKind, listingId);
      if (metrics) {
        setSaved(metrics.saved);
        setSaveCount(metrics.saveCount);
      }
    },
    [listingKind, listingId, router, user],
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
          count={saveCount}
          active={saved}
          icon={<BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'regular'} />}
          onClick={handleSave}
        />
      </Stack>
    </Box>
  );
}
