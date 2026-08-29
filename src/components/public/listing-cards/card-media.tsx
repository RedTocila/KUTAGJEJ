'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Box, Chip, IconButton, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import { paths } from '@/paths';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { nextSaveCount, nextShareCount, toggleListingSave, type ListingMetricKind } from '@/lib/listing-metrics';
import type { ListingSharePayload } from '@/lib/listing-share';
import { listingCardImageUrl, storageImageOriginalUrl } from '@/lib/storage-image';
import { useSavedListingsOptional } from '@/contexts/saved-listings-context';
import { useListingSaveCount, useListingSavedState } from '@/hooks/use-listing-saved-state';
import { useUser } from '@/hooks/use-user';
import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { ListingPremiumBadge } from '@/components/public/listing-premium-badge';
import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import { ListingVerifiedBadge } from '@/components/public/professional-listing-detail-ui';

import { OkazionCountdownPlaceholder } from './okazion-countdown';

const OkazionCountdown = dynamic(() => import('./okazion-countdown').then((m) => m.OkazionCountdown), {
  ssr: false,
  loading: () => <OkazionCountdownPlaceholder />,
});
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
  height?: number | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string } | string;
  /** Explicit aspect ratio for the media container (e.g. '1 / 1' for square Instagram style). */
  aspectRatio?: string | { xs?: string; sm?: string; md?: string; lg?: string };
  /** Compact mode for 2-column mobile grids (smaller action buttons, mini okazion discount icon + short days timer). */
  compact?: boolean;
  bottomOverlay?: React.ReactNode;
  /** Bottom-right chip (e.g. job expiry). */
  bottomRightOverlay?: React.ReactNode;
  shareCount?: number;
  saveCount?: number;
  saved?: boolean;
  /** Premium listing — amber card chrome (bookmark stays primary green). */
  premium?: boolean;
  /** OKAZION listing — red badge / countdown (bookmark stays primary green). */
  okazion?: boolean;
  /** When OKAZION ends (ISO). Countdown falls back to 7 days if omitted. */
  okazionUntil?: string | null;
  /** Seller verification status. Rendered at bottom-right of the image. */
  sellerVerified?: boolean;
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
  height,
  aspectRatio,
  compact = false,
  bottomOverlay,
  bottomRightOverlay,
  shareCount: initialShareCount = 0,
  saveCount: initialSaveCount = 0,
  saved: initialSaved,
  premium = false,
  okazion = false,
  okazionUntil = null,
  sellerVerified = false,
  sharePayload,
  priority = false,
}: CardMediaProps) {
  const router = useRouter();
  const { user } = useUser();
  const savedCtx = useSavedListingsOptional();
  const saved = useListingSavedState(listingKind, listingId, initialSaved);
  const cachedSaveCount = useListingSaveCount(listingKind, listingId, initialSaveCount, saved);
  const [shareCount, setShareCount] = React.useState(initialShareCount);
  const [localSaveCount, setLocalSaveCount] = React.useState(initialSaveCount);
  const [shareOpen, setShareOpen] = React.useState(false);
  const thumbUrl = React.useMemo(() => listingCardImageUrl(imageUrl), [imageUrl]);
  const originalUrl = React.useMemo(() => storageImageOriginalUrl(imageUrl), [imageUrl]);
  const [displaySrc, setDisplaySrc] = React.useState<string | null>(thumbUrl);
  const [imageFailed, setImageFailed] = React.useState(false);

  const listingKeyRef = React.useRef(listingId);

  React.useEffect(() => {
    setDisplaySrc(thumbUrl);
    setImageFailed(false);
  }, [thumbUrl]);

  React.useEffect(() => {
    if (listingKeyRef.current !== listingId) {
      listingKeyRef.current = listingId;
      setShareCount(initialShareCount);
      setLocalSaveCount(initialSaveCount);
      return;
    }
    setShareCount((count) => Math.max(count, initialShareCount));
    setLocalSaveCount((count) => (initialSaveCount > count ? initialSaveCount : count));
  }, [initialShareCount, initialSaveCount, listingId]);

  React.useEffect(() => {
    if (saved) setLocalSaveCount((count) => Math.max(count, 1));
  }, [saved]);

  const saveCount = savedCtx ? cachedSaveCount : localSaveCount;

  const showImage = Boolean(displaySrc) && !imageFailed;

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
      ratingAverage: sharePayload?.ratingAverage,
      reviewCount: sharePayload?.reviewCount,
      contactPhone: sharePayload?.contactPhone,
      themeColor: sharePayload?.themeColor,
      url: sharePayload?.url,
    }),
    [alt, imageUrl, listingId, listingKind, saveCount, sharePayload, topLeftBadge]
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
      setLocalSaveCount((count) => Math.max(0, count + (wasSaved ? -1 : 1)));

      if (savedCtx) {
        await savedCtx.toggleSaved(listingKind, listingId, { fromCount: saveCount });
        return;
      }
      const metrics = await toggleListingSave(listingKind, listingId);
      if (metrics) setLocalSaveCount((count) => nextSaveCount(count, metrics));
      else setLocalSaveCount((count) => Math.max(0, count + (wasSaved ? 1 : -1)));
    },
    [listingKind, listingId, router, saveCount, saved, savedCtx, user]
  );

  // OKAZION badge wins when both are active (same priority as before for chrome).
  const showPremiumBadge = premium && !okazion;
  // Keep the OKAZION countdown in the media badge so it remains visible without
  // competing with the listing price.
  const showBottomRight = Boolean(bottomRightOverlay);
  const showSellerBadges = sellerVerified;

  return (
    <Box
      sx={{
        position: 'relative',
        ...(aspectRatio ? { aspectRatio, width: '100%' } : { height: height ?? { xs: 170, md: 186 } }),
        flexShrink: 0,
        borderBottom: compact ? 'none' : '1px solid',
        borderColor: compact ? 'transparent' : 'divider',
        borderRadius: compact ? 1.25 : 0,
        bgcolor: primaryMainAlpha(0.06),
        overflow: 'hidden',
      }}
    >
      {showImage ? (
        <Image
          src={displaySrc!}
          alt={alt}
          fill
          sizes={
            compact
              ? '(max-width: 600px) 50vw, (max-width: 900px) 45vw, 320px'
              : '(max-width: 600px) 92vw, (max-width: 900px) 45vw, 320px'
          }
          priority={priority}
          className="listing-card-media-image"
          style={{ objectFit: 'cover' }}
          onError={() => {
            if (displaySrc && originalUrl && displaySrc !== originalUrl) {
              setDisplaySrc(originalUrl);
              return;
            }
            setImageFailed(true);
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

      {okazion || showPremiumBadge || (!compact && (topLeftOverlay || topLeftBadge)) ? (
        <Stack
          spacing={0.6}
          sx={{
            position: 'absolute',
            top: compact ? 6 : 8,
            left: compact ? 6 : 8,
            zIndex: 3,
            alignItems: 'flex-start',
            maxWidth: compact ? 'calc(100% - 72px)' : 'calc(100% - 88px)',
          }}
        >
          {okazion ? (
            <OkazionCountdown expiresAt={okazionUntil} compact />
          ) : showPremiumBadge ? (
            <ListingPremiumBadge size={compact ? 22 : 28} aria-label="Premium" />
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
            bottom: compact ? 6 : 8,
            right: compact ? 6 : 8,
            zIndex: 3,
            maxWidth: 'calc(100% - 12px)',
            lineHeight: 0,
          }}
        >
          {bottomRightOverlay}
        </Box>
      ) : showSellerBadges ? (
        <Stack
          direction="row"
          spacing={0.35}
          sx={{
            position: 'absolute',
            bottom: bottomOverlay ? 28 : 6,
            right: 6,
            zIndex: 3,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 0,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: compact ? -4 : -8,
              borderRadius: '50%',
              background: compact
                ? 'radial-gradient(circle, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.06) 42%, rgba(0,0,0,0) 72%)'
                : 'radial-gradient(circle, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.2) 42%, rgba(0,0,0,0) 72%)',
              pointerEvents: 'none',
            },
            '& > *': { position: 'relative', zIndex: 1 },
          }}
        >
          {sellerVerified ? <ListingVerifiedBadge size={compact ? 14 : 18} aria-label="Shitës i verifikuar" /> : null}
        </Stack>
      ) : null}

      {compact ? (
        <Stack
          direction="row"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            alignItems: 'center',
            zIndex: 3,
            height: 'auto',
            gap: 0.25,
          }}
        >
          <IconButton
            aria-label="Ndaj njoftimin"
            onClick={handleShare}
            size="small"
            sx={{
              width: 28,
              height: 28,
              p: 0,
              color: '#fff',
              position: 'relative',
              overflow: 'visible',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: -5,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.14) 38%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none',
              },
              '& > svg': { position: 'relative', zIndex: 1 },
              transition: 'color 0.15s ease, transform 0.1s ease, background-color 0.15s ease',
              '&:hover': { bgcolor: alpha('#fff', 0.14) },
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <ShareNetworkIcon size={17} weight="bold" />
          </IconButton>
          <IconButton
            aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj njoftimin'}
            onClick={handleSave}
            size="small"
            sx={{
              width: 28,
              height: 28,
              p: 0,
              color: saved ? 'primary.main' : '#fff',
              position: 'relative',
              overflow: 'visible',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: -5,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.14) 38%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none',
              },
              '& > svg': { position: 'relative', zIndex: 1 },
              transition: 'color 0.15s ease, transform 0.1s ease, background-color 0.15s ease',
              '&:hover': { bgcolor: alpha('#fff', 0.14) },
              '&:active': { transform: 'scale(0.92)' },
            }}
          >
            <BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'bold'} />
          </IconButton>
        </Stack>
      ) : (
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            alignItems: 'center',
            zIndex: 3,
          }}
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
            accent="primary"
            icon={<BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'regular'} />}
            onClick={handleSave}
          />
        </Stack>
      )}

      {shareOpen ? (
        <ListingSharePage
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={resolvedSharePayload}
          onShared={(metrics) => setShareCount((count) => nextShareCount(count, metrics))}
        />
      ) : null}
    </Box>
  );
}
