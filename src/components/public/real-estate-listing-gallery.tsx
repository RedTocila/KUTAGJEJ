'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IconButton, Box, Typography, Avatar, Skeleton, Stack, ButtonBase } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';

import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { recordListingMetricEvent, type ListingMetricKind } from '@/lib/listing-metrics';
import type { ListingGalleryPlaceholderKey } from '@/lib/listing-gallery-placeholder';
import { paths } from '@/paths';

export type { ListingGalleryPlaceholderKey };

/** @deprecated Use `ListingGalleryPlaceholderKey`. */
export type ListingGalleryPlaceholderIcon = Extract<ListingGalleryPlaceholderKey, 'house' | 'buildings'>;

const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SLIDE_DURATION_MS = 620;
const SWIPE_COMMIT_RATIO = 0.18;
const SWIPE_COMMIT_MIN_PX = 56;

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  return prefersReducedMotion;
}

export function RealEstateListingGallery(props: {
  title: string;
  imageUrls: string[];
  placeholderIcon?: ListingGalleryPlaceholderKey;
  /** Default: `/prona` */
  browseListHref?: string;
  browseListAriaLabel?: string;
  /**
   * Pass through to next/image `sizes` for the hero (e.g. when gallery sits beside a sidebar on desktop).
   * Default `'100vw'`.
   */
  heroSizes?: string;
  /** When set, enables the bookmark control (styling unchanged). */
  bookmark?: {
    saved: boolean;
    onToggle: () => void;
    ariaLabelSave?: string;
    ariaLabelSaved?: string;
  };
  /** Hide the bottom-right `1/3` slide counter on the hero. */
  hideSlideCount?: boolean;
  /** Share / save chip surface — `glass` is soft dark transparent on photo heroes. */
  mediaActionSurface?: 'hero' | 'glass' | 'card';
  listingKind?: ListingMetricKind;
  listingId?: string;
  shareCount?: number;
  saveCount?: number;
}) {
  const {
    title,
    imageUrls: urlsRaw,
    placeholderIcon = 'buildings',
    browseListHref = paths.public.realEstate,
    browseListAriaLabel = 'Prapa te lista e pronës',
    heroSizes = '100vw',
    bookmark,
    hideSlideCount = false,
    mediaActionSurface = 'hero',
    listingKind,
    listingId,
    shareCount: initialShareCount = 0,
    saveCount: initialSaveCount = 0,
  } = props;
  const urls = urlsRaw.filter(Boolean);
  const [shareCount, setShareCount] = React.useState(initialShareCount);
  const [saveCount, setSaveCount] = React.useState(initialSaveCount);
  const prefersReducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    setShareCount(initialShareCount);
  }, [initialShareCount]);

  React.useEffect(() => {
    setSaveCount(initialSaveCount);
  }, [initialSaveCount]);
  const showPlaceholder = urls.length === 0;

  const [active, setActive] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(0);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const dragStartRef = React.useRef<{ x: number; pointerId: number } | null>(null);
  const thumbnailRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    setActive(0);
    setDragOffset(0);
    setIsDragging(false);
    dragStartRef.current = null;
  }, [urls.join('|')]);

  React.useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const syncWidth = () => setViewportWidth(node.clientWidth);
    syncWidth();

    const observer = new ResizeObserver(syncWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [urls.length, showPlaceholder]);

  React.useEffect(() => {
    const thumb = thumbnailRefs.current[active];
    thumb?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }, [active, prefersReducedMotion]);

  const PLACEHOLDER_BY_KEY: Record<ListingGalleryPlaceholderKey, typeof HouseIcon> = {
    house: HouseIcon,
    buildings: BuildingsIcon,
    car: CarIcon,
    briefcase: BriefcaseIcon,
    shopping: ShoppingBagIcon,
    storefront: StorefrontIcon,
    professional: UserCircleIcon,
  };
  const PlaceholderSvg = PLACEHOLDER_BY_KEY[placeholderIcon];

  const hasMultipleImages = urls.length > 1;

  const goToIndex = React.useCallback(
    (index: number) => {
      if (urls.length === 0) return;
      const normalized = ((index % urls.length) + urls.length) % urls.length;
      setActive(normalized);
    },
    [urls.length],
  );

  const goToPrevious = React.useCallback(() => {
    setActive((index) => (index - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goToNext = React.useCallback(() => {
    setActive((index) => (index + 1) % urls.length);
  }, [urls.length]);

  const slideTransition = prefersReducedMotion
    ? `transform ${Math.round(SLIDE_DURATION_MS * 0.25)}ms ease`
    : `transform ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`;

  const slideWidthPx = viewportWidth > 0 ? viewportWidth : null;
  const trackTransform =
    slideWidthPx != null
      ? `translate3d(${-active * slideWidthPx + dragOffset}px, 0, 0)`
      : `translate3d(calc((-${active} * 100% / ${Math.max(urls.length, 1)}) + ${dragOffset}px), 0, 0)`;

  const finishDrag = React.useCallback(
    (clientX: number, pointerId: number, target: HTMLElement) => {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== pointerId) return;

      const delta = clientX - start.x;
      const threshold = Math.max(SWIPE_COMMIT_MIN_PX, viewportWidth * SWIPE_COMMIT_RATIO);

      if (delta <= -threshold) goToNext();
      else if (delta >= threshold) goToPrevious();

      dragStartRef.current = null;
      setIsDragging(false);
      setDragOffset(0);

      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    },
    [goToNext, goToPrevious, viewportWidth],
  );

  const isGalleryControlTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest('[data-gallery-control]'));

  const handleViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasMultipleImages || event.button !== 0 || isGalleryControlTarget(event.target)) return;

    dragStartRef.current = { x: event.clientX, pointerId: event.pointerId };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleViewportPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    setDragOffset(event.clientX - start.x);
  };

  const handleViewportPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(event.clientX, event.pointerId, event.currentTarget);
  };

  const handleViewportPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(event.clientX, event.pointerId, event.currentTarget);
  };

  const handleViewportKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNext();
    }
  };

  const heroNavButtonSx = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 5,
    pointerEvents: 'auto',
    bgcolor: alpha('#000', 0.45),
    color: '#fff',
    backdropFilter: 'blur(10px)',
    '&:hover': { bgcolor: alpha('#000', 0.62) },
  } as const;

  const stopGalleryControlEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleShare = React.useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ title, text: title, url: window.location.href });
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
      if (listingKind && listingId) {
        const metrics = await recordListingMetricEvent(listingKind, listingId, 'share');
        if (metrics) setShareCount(metrics.shareCount);
      }
    },
    [title, listingKind, listingId],
  );

  return (
    <Box sx={{ position: 'relative', width: '100%', bgcolor: 'background.default' }}>
      <Box
        ref={viewportRef}
        role={hasMultipleImages ? 'group' : undefined}
        aria-roledescription={hasMultipleImages ? 'carousel' : undefined}
        aria-label={hasMultipleImages ? `Galeria e fotove, ${active + 1} nga ${urls.length}` : undefined}
        tabIndex={hasMultipleImages ? 0 : undefined}
        onKeyDown={handleViewportKeyDown}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerCancel}
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 10',
          maxHeight: { xs: 'min(300px, 44vh)', sm: 'min(520px, 68vh)', md: 560 },
          overflow: 'hidden',
          mx: 'auto',
          touchAction: hasMultipleImages ? 'pan-y pinch-zoom' : 'auto',
          cursor: isDragging ? 'grabbing' : hasMultipleImages ? 'grab' : 'default',
          userSelect: isDragging ? 'none' : 'auto',
          outline: 'none',
          '&:focus-visible': hasMultipleImages
            ? {
                boxShadow: (theme) => `inset 0 0 0 2px ${alpha(theme.palette.primary.main, 0.55)}`,
              }
            : undefined,
        }}
      >
        {showPlaceholder ? (
          <Stack
            sx={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              // `primaryMainAlpha` uses `--mui-palette-primary-mainChannel`; do not pass `palette.primary.main` to `alpha()` (often `var(...)`).
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? `linear-gradient(145deg, ${primaryMainAlpha(0.14)} 0%, ${theme.palette.grey[900]} 45%, rgba(0,0,0,0.9) 100%)`
                  : `linear-gradient(145deg, ${primaryMainAlpha(0.12)} 0%, ${theme.palette.grey[50]} 50%, ${primaryMainAlpha(0.06)} 100%)`,
            }}
          >
            <Avatar
              sx={{
                width: 88,
                height: 88,
                bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.12),
                color: 'primary.main',
                border: `1px solid ${primaryMainAlpha(0.38)}`,
              }}
              variant="rounded"
              aria-hidden
            >
              <PlaceholderSvg weight="regular" size={42} />
            </Avatar>
            <Typography
              sx={{ mt: 2.5, maxWidth: 280, px: 2, textAlign: 'center', color: 'text.primary', opacity: 0.92, fontSize: '0.9rem', fontWeight: 600 }}
            >
              {title}
            </Typography>
          </Stack>
        ) : hasMultipleImages ? (
          <Box
            sx={{
              display: 'flex',
              height: '100%',
              width: slideWidthPx != null ? slideWidthPx * urls.length : `${urls.length * 100}%`,
              transform: trackTransform,
              transition: isDragging ? 'none' : slideTransition,
              willChange: 'transform',
            }}
          >
            {urls.map((url, idx) => {
              const isNearActive = Math.abs(idx - active) <= 1;
              return (
                <Box
                  key={`${url}-${idx}`}
                  sx={{
                    position: 'relative',
                    flexShrink: 0,
                    width:
                      slideWidthPx != null
                        ? slideWidthPx
                        : `calc(100% / ${Math.max(urls.length, 1)})`,
                    height: '100%',
                    overflow: 'hidden',
                  }}
                  aria-hidden={idx !== active}
                >
                  <Image
                    src={url}
                    alt={idx === active ? title : ''}
                    fill
                    sizes={heroSizes}
                    draggable={false}
                    style={{ objectFit: 'cover', pointerEvents: 'none' }}
                    {...(idx === 0
                      ? { priority: true }
                      : { loading: isNearActive ? ('eager' as const) : ('lazy' as const) })}
                  />
                </Box>
              );
            })}
          </Box>
        ) : urls[0] ? (
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            <Image src={urls[0]} alt={title} fill priority sizes={heroSizes} style={{ objectFit: 'cover' }} />
          </Box>
        ) : (
          <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0, height: 1 }} />
        )}

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            pointerEvents: 'none',
            '& [data-gallery-control]': { pointerEvents: 'auto' },
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              p: { xs: 1, sm: 1.75 },
            }}
          >
            <IconButton
              component={Link}
              href={browseListHref}
              aria-label={browseListAriaLabel}
              size="medium"
              data-gallery-control
              onPointerDown={stopGalleryControlEvent}
              sx={{
                bgcolor: alpha('#000', 0.45),
                color: '#fff',
                backdropFilter: 'blur(10px)',
                '&:hover': { bgcolor: alpha('#000', 0.62) },
              }}
            >
              <ArrowLeftIcon size={22} weight="regular" />
            </IconButton>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box data-gallery-control component="span" sx={{ display: 'inline-flex' }}>
                <ListingMediaActionButton
                  aria-label="Ndaj njoftimin"
                  count={shareCount}
                  surface={mediaActionSurface}
                  icon={<ShareNetworkIcon size={17} weight="regular" />}
                  onClick={handleShare}
                />
              </Box>
              <Box data-gallery-control component="span" sx={{ display: 'inline-flex' }}>
              <ListingMediaActionButton
                aria-label={
                  bookmark
                    ? bookmark.saved
                      ? (bookmark.ariaLabelSaved ?? 'Hiq nga të ruajturat')
                      : (bookmark.ariaLabelSave ?? 'Ruaj njoftimin')
                    : 'Ruaj njoftimin'
                }
                count={saveCount}
                surface={mediaActionSurface}
                active={bookmark?.saved}
                disabled={!bookmark}
                icon={<BookmarkSimpleIcon size={17} weight={bookmark?.saved ? 'fill' : 'regular'} />}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  bookmark?.onToggle();
                }}
              />
              </Box>
            </Stack>
          </Stack>

          {!showPlaceholder && hasMultipleImages ? (
            <>
              <IconButton
                aria-label="Fotoja e mëparshme"
                size="medium"
                data-gallery-control
                onPointerDown={stopGalleryControlEvent}
                onClick={(event) => {
                  stopGalleryControlEvent(event);
                  goToPrevious();
                }}
                sx={{ ...heroNavButtonSx, left: { xs: 8, sm: 12 } }}
              >
                <CaretLeftIcon size={22} weight="bold" />
              </IconButton>
              <IconButton
                aria-label="Fotoja tjetër"
                size="medium"
                data-gallery-control
                onPointerDown={stopGalleryControlEvent}
                onClick={(event) => {
                  stopGalleryControlEvent(event);
                  goToNext();
                }}
                sx={{ ...heroNavButtonSx, right: { xs: 8, sm: 12 } }}
              >
                <CaretRightIcon size={22} weight="bold" />
              </IconButton>
            </>
          ) : null}
        </Box>

        {!showPlaceholder && !hideSlideCount ? (
          <Typography
            component="span"
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              px: 1.25,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              bgcolor: alpha('#000', 0.55),
              color: '#fff',
              backdropFilter: 'blur(10px)',
              zIndex: 1,
            }}
          >
            {`${active + 1}/${urls.length}`}
          </Typography>
        ) : null}
      </Box>

      {!showPlaceholder && urls.length > 1 ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            px: { xs: 1.25, sm: 2 },
            pb: { xs: 1.25, sm: 1.75 },
            pt: 1.25,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {urls.map((url, idx) => (
            <ButtonBase
              key={url}
              ref={(node) => {
                thumbnailRefs.current[idx] = node;
              }}
              focusRipple
              aria-label={`Fotoja ${idx + 1}`}
              aria-pressed={idx === active}
              onClick={() => goToIndex(idx)}
              sx={{
                flex: '0 0 auto',
                borderRadius: 1.25,
                overflow: 'hidden',
                outline: idx === active ? '2px solid' : 'none',
                outlineOffset: idx === active ? 2 : 0,
                outlineColor: idx === active ? 'primary.main' : 'transparent',
                width: { xs: 72, sm: 88 },
                height: { xs: 52, sm: 62 },
                opacity: idx === active ? 1 : 0.72,
                transform: idx === active ? 'scale(1)' : 'scale(0.98)',
                transition: prefersReducedMotion
                  ? 'none'
                  : `opacity 280ms ease, transform 280ms ${SLIDE_EASING}, outline-color 280ms ease`,
              }}
            >
              <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image src={url} alt="" fill sizes="120px" style={{ objectFit: 'cover' }} />
              </Box>
            </ButtonBase>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}
