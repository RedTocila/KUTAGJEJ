'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Box, Chip, Stack } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import { useSavedListingsOptional } from '@/contexts/saved-listings-context';
import { useListingSavedState } from '@/hooks/use-listing-saved-state';
import { useUser } from '@/hooks/use-user';
import type { ListingSharePayload } from '@/lib/listing-share';
import {
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
  /** Custom overlay on the image (e.g. rating chip) — rendered at top-left. */
  topLeftOverlay?: React.ReactNode;
  topRightBadge?: string;
  height?: number;
  bottomOverlay?: React.ReactNode;
  shareCount?: number;
  saveCount?: number;
  saved?: boolean;
  /** Premium listing — amber bookmark accent. */
  premium?: boolean;
  /** Rich data for the share sheet / Instagram story template. */
  sharePayload?: Omit<ListingSharePayload, 'listingKind' | 'listingId' | 'title'> & {
    title?: string;
  };
}

export function CardMedia({
  listingKind,
  listingId,
  imageUrl,
  FallbackIcon,
  alt,
  topLeftBadge,
  topLeftOverlay,
  topRightBadge,
  height = 170,
  bottomOverlay,
  shareCount: initialShareCount = 0,
  saveCount: initialSaveCount = 0,
  saved: initialSaved,
  premium = false,
  sharePayload,
}: CardMediaProps) {
  const router = useRouter();
  const { user } = useUser();
  const savedCtx = useSavedListingsOptional();
  const saved = useListingSavedState(listingKind, listingId, initialSaved);
  const [shareCount, setShareCount] = React.useState(initialShareCount);
  const [saveCount, setSaveCount] = React.useState(initialSaveCount);
  const [shareOpen, setShareOpen] = React.useState(false);

  React.useEffect(() => {
    setShareCount(initialShareCount);
  }, [initialShareCount]);

  React.useEffect(() => {
    setSaveCount(initialSaveCount);
  }, [initialSaveCount]);

  const resolvedSharePayload = React.useMemo<ListingSharePayload>(
    () => ({
      listingKind,
      listingId,
      title: sharePayload?.title ?? alt,
      category: sharePayload?.category,
      priceLabel: sharePayload?.priceLabel,
      badge: sharePayload?.badge ?? topLeftBadge,
      imageUrl: sharePayload?.imageUrl ?? imageUrl,
      location: sharePayload?.location,
      specs: sharePayload?.specs,
      createdAt: sharePayload?.createdAt,
      viewCount: sharePayload?.viewCount,
      saveCount: sharePayload?.saveCount ?? saveCount,
      url: sharePayload?.url,
    }),
    [alt, imageUrl, listingId, listingKind, saveCount, sharePayload, topLeftBadge],
  );

  const handleShare = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShareOpen(true);
  }, []);

  const handleSave = React.useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!user) {
        router.push(paths.user.auth);
        return;
      }
      if (savedCtx) {
        const result = await savedCtx.toggleSaved(listingKind, listingId);
        if (result) setSaveCount(result.saveCount);
        return;
      }
      const metrics = await toggleListingSave(listingKind, listingId);
      if (metrics) setSaveCount(metrics.saveCount);
    },
    [listingKind, listingId, router, savedCtx, user],
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
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 600px) 100vw, 320px"
          style={{ objectFit: 'cover' }}
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

      {topLeftOverlay ? (
        <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 3, lineHeight: 0 }}>
          {topLeftOverlay}
        </Box>
      ) : topLeftBadge ? (
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
          accent={premium ? 'warning' : 'primary'}
          icon={<BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'regular'} />}
          onClick={handleSave}
        />
      </Stack>

      <ListingSharePage
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        payload={resolvedSharePayload}
        onShared={(metrics) => setShareCount(metrics.shareCount)}
      />
    </Box>
  );
}
