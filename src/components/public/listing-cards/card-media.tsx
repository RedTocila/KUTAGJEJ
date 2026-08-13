'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Box, Chip, Stack } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { OKAZION_ACCENT } from '@/lib/home-categories';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';
import { useSavedListingsOptional } from '@/contexts/saved-listings-context';
import { useListingSavedState } from '@/hooks/use-listing-saved-state';
import { useUser } from '@/hooks/use-user';
import type { ListingSharePayload } from '@/lib/listing-share';
import {
  fetchListingMetrics,
  toggleListingSave,
  type ListingMetricKind,
} from '@/lib/listing-metrics';
import { paths } from '@/paths';

import { OkazionCountdownPlaceholder } from './okazion-countdown';

const OkazionCountdown = dynamic(
  () => import('./okazion-countdown').then((m) => m.OkazionCountdown),
  {
    ssr: false,
    loading: () => <OkazionCountdownPlaceholder />,
  },
);
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
  /** Media height — number or breakpoint map so desktop cards can match mobile proportions. */
  height?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  bottomOverlay?: React.ReactNode;
  /** Bottom-right chip (e.g. job expiry) — same slot as OKAZION countdown. */
  bottomRightOverlay?: React.ReactNode;
  shareCount?: number;
  saveCount?: number;
  saved?: boolean;
  /** Premium listing — amber card chrome (bookmark stays primary green). */
  premium?: boolean;
  /** OKAZION listing — red badge / countdown (bookmark stays primary green). */
  okazion?: boolean;
  /** When OKAZION ends (ISO). Countdown falls back to 5 days if omitted. */
  okazionUntil?: string | null;
  /** Rich data for the share sheet / Instagram story template. */
  sharePayload?: Omit<ListingSharePayload, 'listingKind' | 'listingId' | 'title'> & {
    title?: string;
  };
  /** Eager-load for above-the-fold cards (LCP). */
  priority?: boolean;
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
  height = { xs: 170, md: 186 },
  bottomOverlay,
  bottomRightOverlay,
  shareCount: initialShareCount = 0,
  saveCount: initialSaveCount = 0,
  saved: initialSaved,
  premium = false,
  okazion = false,
  okazionUntil = null,
  sharePayload,
  priority = false,
}: CardMediaProps) {
  const router = useRouter();
  const { user } = useUser();
  const savedCtx = useSavedListingsOptional();
  const saved = useListingSavedState(listingKind, listingId, initialSaved);
  const [shareCount, setShareCount] = React.useState(initialShareCount);
  const [saveCount, setSaveCount] = React.useState(initialSaveCount);
  const [metricsReady, setMetricsReady] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !imageFailed;

  React.useEffect(() => {
    let cancelled = false;
    setMetricsReady(false);

    void fetchListingMetrics(listingKind, listingId).then((metrics) => {
      if (cancelled) return;
      if (metrics) {
        setShareCount(metrics.shareCount);
        setSaveCount(metrics.saveCount);
      }
      setMetricsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [listingId, listingKind]);

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
      const wasSaved = saved;
      setMetricsReady(true);
      setSaveCount((count) => Math.max(0, count + (wasSaved ? -1 : 1)));

      if (savedCtx) {
        const result = await savedCtx.toggleSaved(listingKind, listingId);
        if (result && !result.stale) setSaveCount(result.saveCount);
        else if (!result) setSaveCount((count) => Math.max(0, count + (wasSaved ? 1 : -1)));
        return;
      }
      const metrics = await toggleListingSave(listingKind, listingId);
      if (metrics) setSaveCount(metrics.saveCount);
      else setSaveCount((count) => Math.max(0, count + (wasSaved ? 1 : -1)));
    },
    [listingKind, listingId, router, saved, savedCtx, user],
  );

  // OKAZION badge wins when both are active (same priority as before for chrome).
  const showPremiumBadge = premium && !okazion;
  const showBottomRight = Boolean(okazion || bottomRightOverlay);

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
      {showImage ? (
        <Image
          src={imageUrl!}
          alt={alt}
          fill
          sizes="(max-width: 600px) 100vw, 320px"
          priority={priority}
          className="listing-card-media-image"
          style={{ objectFit: 'cover' }}
          onError={() => setImageFailed(true)}
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

      {(okazion || showPremiumBadge || topLeftOverlay || topLeftBadge) ? (
        <Stack
          spacing={0.6}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 3,
            alignItems: 'flex-start',
            maxWidth: 'calc(100% - 88px)',
          }}
        >
          {okazion ? (
            <Chip
              label="OKAZION"
              size="small"
              sx={{
                height: 28,
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: 0.5,
                bgcolor: OKAZION_ACCENT,
                color: '#fff',
                flexShrink: 0,
                boxShadow: '0 2px 10px rgba(239, 68, 68, 0.55)',
                '& .MuiChip-label': { px: 1.1 },
              }}
            />
          ) : showPremiumBadge ? (
            <ListingTrustBadge
              size={28}
              aria-label="Premium"
              sx={{
                filter: 'drop-shadow(0 2px 10px rgba(245, 166, 35, 0.55))',
              }}
            />
          ) : topLeftOverlay ? (
            <Box sx={{ lineHeight: 0 }}>{topLeftOverlay}</Box>
          ) : topLeftBadge ? (
            <Chip
              label={topLeftBadge}
              size="small"
              sx={{
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
        </Stack>
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
            bottom: showBottomRight ? 44 : 0,
            zIndex: 2,
            pointerEvents: 'none',
            '& > *': { pointerEvents: 'auto' },
          }}
        >
          {bottomOverlay}
        </Box>
      ) : null}

      {showBottomRight ? (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            zIndex: 3,
            maxWidth: 'calc(100% - 16px)',
            lineHeight: 0,
          }}
        >
          {okazion ? <OkazionCountdown expiresAt={okazionUntil} /> : bottomRightOverlay}
        </Box>
      ) : null}

      <Stack
        direction="row"
        spacing={0.75}
        sx={{ position: 'absolute', top: 8, right: 8, alignItems: 'center', zIndex: 3 }}
      >
        <ListingMediaActionButton
          aria-label="Ndaj njoftimin"
          count={metricsReady ? shareCount : null}
          icon={<ShareNetworkIcon size={17} weight="regular" />}
          onClick={handleShare}
        />
        <ListingMediaActionButton
          aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj njoftimin'}
          count={metricsReady ? saveCount : null}
          active={saved}
          accent="primary"
          icon={<BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'regular'} />}
          onClick={handleSave}
        />
      </Stack>

      {shareOpen ? (
        <ListingSharePage
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={resolvedSharePayload}
          onShared={(metrics) => setShareCount(metrics.shareCount)}
        />
      ) : null}
    </Box>
  );
}
