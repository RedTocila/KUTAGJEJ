'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, Box, ButtonBase, IconButton, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { ShoppingBag as ShoppingBagIcon } from '@phosphor-icons/react/dist/ssr/ShoppingBag';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';

import { paths } from '@/paths';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { ListingGalleryPlaceholderKey } from '@/lib/listing-gallery-placeholder';
import { emitListingPhotoView } from '@/lib/listing-hot-lead';
import { nextShareCount, type ListingMetricKind } from '@/lib/listing-metrics';
import type { ListingSharePayload } from '@/lib/listing-share';
import { listingHeroImageUrl, listingThumbImageUrl } from '@/lib/storage-image';
import { useHistoryBackProps } from '@/hooks/use-navigate-back';
import { useListingSaveCount } from '@/hooks/use-listing-saved-state';
import { ImageLightbox } from '@/components/common/image-lightbox';
import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import { OwnerEditPencil } from '@/components/user/owner-edit-pencil';

export type { ListingGalleryPlaceholderKey };

/** @deprecated Use `ListingGalleryPlaceholderKey`. */
export type ListingGalleryPlaceholderIcon = Extract<ListingGalleryPlaceholderKey, 'house' | 'buildings'>;

const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SLIDE_DURATION_MS = 320;
const SWIPE_COMMIT_RATIO = 0.18;
const SWIPE_COMMIT_MIN_PX = 56;
const TAP_MAX_PX = 12;
/** Full-height side hit zones for prev/next; middle stays preview. */
const SIDE_NAV_WIDTH = '8%';
const AXIS_LOCK_PX = 10;
const HERO_NAV_HIDE_DELAY_MS = 4000;

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
  /** Optional custom placeholder content for photo-free listing types. */
  placeholderContent?: React.ReactNode;
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
  /** Rich data for the Instagram story share template. */
  sharePayload?: Omit<ListingSharePayload, 'listingKind' | 'listingId' | 'title'> & {
    title?: string;
  };
  /** Owner-edit mode: pencil on the gallery to change photos. */
  onEditPhotos?: () => void;
  /** Rendered inside the hero photo (e.g. reviews or countdown chip). */
  heroOverlay?: React.ReactNode;
  /** Position for the hero overlay. */
  heroOverlayPosition?: 'left' | 'right';
}) {
  const {
    title,
    imageUrls: urlsRaw,
    placeholderIcon = 'buildings',
    placeholderContent,
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
    sharePayload,
    onEditPhotos,
    heroOverlay,
    heroOverlayPosition = 'right',
  } = props;
  const urls = urlsRaw.filter((u) => {
    const s = String(u || '').trim();
    return s && !/^blob:/i.test(s) && !/^data:/i.test(s);
  });
  const [shareCount, setShareCount] = React.useState(initialShareCount);
  const cachedSaveCount = useListingSaveCount(
    listingKind ?? 'real-estate',
    listingId ?? '',
    initialSaveCount,
    Boolean(bookmark?.saved),
  );
  const saveCount = listingKind && listingId ? cachedSaveCount : initialSaveCount;
  const [shareOpen, setShareOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const historyBack = useHistoryBackProps(browseListHref);

  React.useEffect(() => {
    setShareCount(initialShareCount);
  }, [listingId]);

  React.useEffect(() => {
    setShareCount((count) => Math.max(count, initialShareCount));
  }, [initialShareCount]);
  const showPlaceholder = urls.length === 0;

  const [active, setActive] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const [heroNavVisible, setHeroNavVisible] = React.useState(true);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const dragStartRef = React.useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const dragOffsetRef = React.useRef(0);
  /** `null` until gesture axis is decided; `vertical` aborts slide so the page can scroll. */
  const dragAxisRef = React.useRef<'horizontal' | 'vertical' | null>(null);
  const activeRef = React.useRef(0);
  const thumbnailRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const thumbnailStripRef = React.useRef<HTMLDivElement>(null);

  activeRef.current = active;

  const applyTrackTransform = React.useCallback(
    (index: number, offsetPx: number, withTransition: boolean) => {
      const el = trackRef.current;
      if (!el) return;
      const width = viewportRef.current?.clientWidth ?? viewportWidth;
      el.style.transition =
        withTransition && !prefersReducedMotion
          ? `transform ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`
          : withTransition
            ? `transform ${Math.round(SLIDE_DURATION_MS * 0.25)}ms ease`
            : 'none';
      if (width > 0) {
        el.style.transform = `translate3d(${-index * width + offsetPx}px, 0, 0)`;
      } else {
        el.style.transform = `translate3d(calc((-${index} * 100% / ${Math.max(urls.length, 1)}) + ${offsetPx}px), 0, 0)`;
      }
    },
    [prefersReducedMotion, urls.length, viewportWidth]
  );

  React.useEffect(() => {
    setActive(0);
    setIsDragging(false);
    dragStartRef.current = null;
    dragOffsetRef.current = 0;
    dragAxisRef.current = null;
    applyTrackTransform(0, 0, false);
  }, [urls.join('|'), applyTrackTransform]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setHeroNavVisible(false), HERO_NAV_HIDE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

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
    if (isDragging) return;
    applyTrackTransform(active, 0, true);
  }, [active, applyTrackTransform, isDragging]);

  React.useEffect(() => {
    const strip = thumbnailStripRef.current;
    const thumb = thumbnailRefs.current[active];
    if (!strip || !thumb) return;

    // Keep thumb centering inside the strip so we never scroll the page.
    const stripRect = strip.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const thumbCenterInStrip =
      thumbRect.left - stripRect.left + strip.scrollLeft + thumbRect.width / 2;
    const nextLeft = thumbCenterInStrip - strip.clientWidth / 2;
    const maxScroll = Math.max(0, strip.scrollWidth - strip.clientWidth);
    const clamped = Math.max(0, Math.min(nextLeft, maxScroll));

    strip.scrollTo({
      left: clamped,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [active, prefersReducedMotion]);

  React.useEffect(() => {
    if (!listingKind || !listingId || showPlaceholder) return;
    emitListingPhotoView(listingKind, listingId, active);
  }, [active, listingId, listingKind, showPlaceholder]);

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

  // Block page scroll only while a horizontal slide is in progress.
  React.useEffect(() => {
    const node = viewportRef.current;
    if (!node || !hasMultipleImages) return undefined;

    const onTouchMove = (event: TouchEvent) => {
      if (dragAxisRef.current === 'horizontal') {
        event.preventDefault();
      }
    };

    node.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => node.removeEventListener('touchmove', onTouchMove);
  }, [hasMultipleImages, urls.length, showPlaceholder]);

  const goToIndex = React.useCallback(
    (index: number) => {
      if (urls.length === 0) return;
      const normalized = ((index % urls.length) + urls.length) % urls.length;
      setActive(normalized);
    },
    [urls.length]
  );

  const goToPrevious = React.useCallback(() => {
    setActive((index) => (index - 1 + urls.length) % urls.length);
  }, [urls.length]);

  const goToNext = React.useCallback(() => {
    setActive((index) => (index + 1) % urls.length);
  }, [urls.length]);

  const slideWidthPx = viewportWidth > 0 ? viewportWidth : null;

  const finishDrag = React.useCallback(
    (clientX: number, clientY: number, pointerId: number, target: HTMLElement, commitTap: boolean) => {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== pointerId) return;

      const axis = dragAxisRef.current;
      const delta = clientX - start.x;
      const distance = Math.hypot(delta, clientY - start.y);
      const threshold = Math.max(SWIPE_COMMIT_MIN_PX, viewportWidth * SWIPE_COMMIT_RATIO);

      dragStartRef.current = null;
      dragOffsetRef.current = 0;
      dragAxisRef.current = null;
      setIsDragging(false);

      if (axis === 'vertical') {
        applyTrackTransform(activeRef.current, 0, false);
        if (target.hasPointerCapture(pointerId)) {
          target.releasePointerCapture(pointerId);
        }
        return;
      }

      if (axis === 'horizontal') {
        if (delta <= -threshold) goToNext();
        else if (delta >= threshold) goToPrevious();
        else applyTrackTransform(activeRef.current, 0, true);
      } else {
        applyTrackTransform(activeRef.current, 0, true);
      }

      if (commitTap && distance < TAP_MAX_PX) {
        setPreviewOpen(true);
      }

      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    },
    [applyTrackTransform, goToNext, goToPrevious, viewportWidth]
  );

  const isGalleryControlTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest('[data-gallery-control]'));

  const handleViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasMultipleImages || event.button !== 0 || isGalleryControlTarget(event.target)) return;

    dragStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    dragOffsetRef.current = 0;
    dragAxisRef.current = null;
    // Mouse: capture immediately. Touch: wait for horizontal lock so vertical scroll still works.
    if (event.pointerType === 'mouse') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleViewportPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (dragAxisRef.current === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical intent: abandon gallery drag so the page can scroll.
        dragAxisRef.current = 'vertical';
        dragStartRef.current = null;
        dragOffsetRef.current = 0;
        setIsDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }
      dragAxisRef.current = 'horizontal';
      setIsDragging(true);
      applyTrackTransform(activeRef.current, 0, false);
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (dragAxisRef.current !== 'horizontal') return;

    dragOffsetRef.current = dx;
    applyTrackTransform(activeRef.current, dx, false);
  };

  const handleViewportPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(event.clientX, event.clientY, event.pointerId, event.currentTarget, true);
  };

  const handleViewportPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(event.clientX, event.clientY, event.pointerId, event.currentTarget, false);
  };

  const openPreview = React.useCallback(() => {
    if (showPlaceholder) return;
    setPreviewOpen(true);
  }, [showPlaceholder]);

  const handleViewportClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (showPlaceholder || hasMultipleImages) return;
    if (isGalleryControlTarget(event.target)) return;
    openPreview();
  };

  const handleViewportKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showPlaceholder && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openPreview();
      return;
    }
    if (!hasMultipleImages) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNext();
    }
  };

  const heroNavZoneSx = {
    position: 'absolute',
    // Keep clear of top chrome (back / share / save) and bottom counter.
    top: 52,
    bottom: 40,
    width: SIDE_NAV_WIDTH,
    minWidth: 40,
    maxWidth: 72,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    bgcolor: 'transparent',
    border: 0,
    p: 0,
    m: 0,
    color: '#fff',
    '&:focus-visible': {
      outline: `2px solid ${primaryMainAlpha(0.7)}`,
      outlineOffset: -2,
    },
  } as const;

  const heroNavIconSx = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: '50%',
    bgcolor: alpha('#000', 0.45),
    color: '#fff',
    backdropFilter: 'blur(10px)',
    transition: 'background-color 160ms ease',
    'button:hover &': { bgcolor: alpha('#000', 0.62) },
  } as const;

  const stopGalleryControlEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleShare = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!listingKind || !listingId) return;
      setShareOpen(true);
    },
    [listingKind, listingId]
  );

  const resolvedSharePayload = React.useMemo<ListingSharePayload | null>(() => {
    if (!listingKind || !listingId) return null;
    return {
      listingKind,
      listingId,
      title: sharePayload?.title ?? title,
      category: sharePayload?.category,
      priceLabel: sharePayload?.priceLabel,
      badge: sharePayload?.badge,
      imageUrl: sharePayload?.imageUrl ?? urls[0] ?? null,
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
    };
  }, [listingId, listingKind, saveCount, sharePayload, title, urls]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        bgcolor: 'background.default',
        // Single-image: match multi-image thumbnail strip vertical padding (pt 1.25 + pb)
        // so the title below isn't flush against the hero.
        ...(!showPlaceholder && urls.length === 1 ? { pb: { xs: 2.5, sm: 3 } } : null),
      }}
    >
      <Box
        ref={viewportRef}
        role={!showPlaceholder ? 'group' : undefined}
        aria-roledescription={hasMultipleImages ? 'carousel' : undefined}
        aria-label={
          hasMultipleImages
            ? `Galeria e fotove, ${active + 1} nga ${urls.length}`
            : !showPlaceholder
              ? `${title}. Shiko foton`
              : undefined
        }
        tabIndex={!showPlaceholder ? 0 : undefined}
        onKeyDown={handleViewportKeyDown}
        onClick={handleViewportClick}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerCancel}
        sx={{
          position: 'relative',
          isolation: 'isolate',
          width: '100%',
          aspectRatio: '16 / 10',
          maxHeight: { xs: 'min(300px, 44vh)', sm: 'min(520px, 68vh)', md: 560 },
          overflow: 'hidden',
          mx: 'auto',
          touchAction: hasMultipleImages ? 'pan-y' : 'auto',
          cursor: isDragging ? 'grabbing' : showPlaceholder ? 'default' : 'zoom-in',
          userSelect: isDragging ? 'none' : 'auto',
          outline: 'none',
          '&:focus-visible': !showPlaceholder
            ? {
                boxShadow: (theme) => `inset 0 0 0 2px ${alpha(theme.palette.primary.main, 0.55)}`,
              }
            : undefined,
        }}
      >
        {showPlaceholder && placeholderContent ? (
          placeholderContent
        ) : showPlaceholder ? (
          <Stack
            sx={(theme) => ({
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.level1',
              backgroundImage: `linear-gradient(160deg, ${primaryMainAlpha(0.1)} 0%, transparent 62%)`,
              ...theme.applyStyles('dark', {
                bgcolor: 'background.default',
                backgroundImage: `linear-gradient(160deg, ${primaryMainAlpha(0.1)} 0%, rgba(0,0,0,0.72) 100%)`,
              }),
            })}
          >
            <Avatar
              sx={(theme) => ({
                width: 88,
                height: 88,
                bgcolor: primaryMainAlpha(0.12),
                color: 'primary.main',
                border: `1px solid ${primaryMainAlpha(0.38)}`,
                ...theme.applyStyles('dark', {
                  bgcolor: primaryMainAlpha(0.16),
                }),
              })}
              variant="rounded"
              aria-hidden
            >
              <PlaceholderSvg weight="regular" size={42} />
            </Avatar>
            <Typography
              sx={{
                mt: 2.5,
                maxWidth: 280,
                px: 2,
                textAlign: 'center',
                color: 'text.primary',
                opacity: 0.92,
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {title}
            </Typography>
          </Stack>
        ) : hasMultipleImages ? (
          <Box
            ref={trackRef}
            sx={{
              position: 'relative',
              zIndex: 0,
              display: 'flex',
              height: '100%',
              width: slideWidthPx != null ? slideWidthPx * urls.length : `${urls.length * 100}%`,
              transform:
                slideWidthPx != null
                  ? `translate3d(${-active * slideWidthPx}px, 0, 0)`
                  : `translate3d(calc(-${active} * 100% / ${Math.max(urls.length, 1)}), 0, 0)`,
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
                    width: slideWidthPx != null ? slideWidthPx : `calc(100% / ${Math.max(urls.length, 1)})`,
                    height: '100%',
                    overflow: 'hidden',
                  }}
                  aria-hidden={idx !== active}
                >
                  <Image
                    src={listingHeroImageUrl(url) ?? url}
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
            <Image
              src={listingHeroImageUrl(urls[0]) ?? urls[0]}
              alt={title}
              fill
              priority
              sizes={heroSizes}
              style={{ objectFit: 'cover' }}
            />
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
              position: 'relative',
              zIndex: 6,
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              p: { xs: 1, sm: 1.75 },
            }}
          >
            <IconButton
              component={Link}
              aria-label={browseListAriaLabel}
              size="medium"
              data-gallery-control
              onPointerDown={stopGalleryControlEvent}
              {...historyBack}
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
              {onEditPhotos ? (
                <Box data-gallery-control component="span" sx={{ display: 'inline-flex' }}>
                  <OwnerEditPencil label="Ndrysho fotot" onClick={onEditPhotos} size="md" />
                </Box>
              ) : (
                <>
                  <Box data-gallery-control component="span" sx={{ display: 'inline-flex' }}>
                    <ListingMediaActionButton
                      aria-label="Ndaj njoftimin"
                      count={shareCount}
                      surface={mediaActionSurface}
                      icon={<PaperPlaneTiltIcon size={17} weight="bold" color="#fff" />}
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
                      icon={<BookmarkSimpleIcon size={17} weight={bookmark?.saved ? 'fill' : 'bold'} color="#fff" />}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        bookmark?.onToggle();
                      }}
                    />
                  </Box>
                </>
              )}
            </Stack>
          </Stack>

          {!showPlaceholder && hasMultipleImages ? (
            <>
              <Box
                component="button"
                type="button"
                aria-label="Fotoja e mëparshme"
                data-gallery-control
                onPointerDown={stopGalleryControlEvent}
                onClick={(event) => {
                  stopGalleryControlEvent(event);
                  goToPrevious();
                }}
                sx={{
                  ...heroNavZoneSx,
                  left: 0,
                  opacity: heroNavVisible ? 1 : 0,
                  pointerEvents: heroNavVisible ? 'auto' : 'none',
                  transition: 'opacity 220ms ease',
                }}
              >
                <Box component="span" sx={heroNavIconSx} aria-hidden>
                  <CaretLeftIcon size={22} weight="bold" />
                </Box>
              </Box>
              <Box
                component="button"
                type="button"
                aria-label="Fotoja tjetër"
                data-gallery-control
                onPointerDown={stopGalleryControlEvent}
                onClick={(event) => {
                  stopGalleryControlEvent(event);
                  goToNext();
                }}
                sx={{
                  ...heroNavZoneSx,
                  right: 0,
                  opacity: heroNavVisible ? 1 : 0,
                  pointerEvents: heroNavVisible ? 'auto' : 'none',
                  transition: 'opacity 220ms ease',
                }}
              >
                <Box component="span" sx={heroNavIconSx} aria-hidden>
                  <CaretRightIcon size={22} weight="bold" />
                </Box>
              </Box>
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
              zIndex: 4,
              pointerEvents: 'none',
            }}
          >
            {`${active + 1}/${urls.length}`}
          </Typography>
        ) : null}

        {heroOverlay ? (
          <Box
            data-gallery-control
            sx={{
              position: 'absolute',
              left: heroOverlayPosition === 'left' ? 10 : undefined,
              right: heroOverlayPosition === 'right' ? 10 : undefined,
              bottom: 8,
              zIndex: 5,
            }}
          >
            {heroOverlay}
          </Box>
        ) : null}
      </Box>

      {!showPlaceholder && urls.length > 1 ? (
        <Stack
          ref={thumbnailStripRef}
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
                  : `opacity 180ms ease, transform 180ms ${SLIDE_EASING}, outline-color 180ms ease`,
              }}
            >
              <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <Image
                  src={listingThumbImageUrl(url) ?? url}
                  alt={`${title} - fotoja ${idx + 1}`}
                  fill
                  sizes="120px"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
            </ButtonBase>
          ))}
        </Stack>
      ) : null}

      {resolvedSharePayload && shareOpen ? (
        <ListingSharePage
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={resolvedSharePayload}
          onShared={(metrics) => setShareCount((count) => nextShareCount(count, metrics))}
        />
      ) : null}

      <ImageLightbox
        open={previewOpen}
        urls={urls}
        index={active}
        alt={title}
        onClose={() => setPreviewOpen(false)}
        onIndexChange={goToIndex}
      />
    </Box>
  );
}
