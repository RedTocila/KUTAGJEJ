'use client';

import * as React from 'react';
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Minus as MinusIcon } from '@phosphor-icons/react/dist/ssr/Minus';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { storageImageOriginalUrl } from '@/lib/storage-image';

const SWIPE_COMMIT_PX = 56;
const TAP_MAX_PX = 12;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const TAP_ZOOM = 2.5;
const ZOOM_STEP = 1.45;
const ZOOM_RESET_EPS = 1.02;
const IGNORE_RESET_MS = 500;

type Zoom = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

const IDENTITY: Zoom = { scale: 1, x: 0, y: 0 };

const controlButtonSx = {
  zIndex: 3,
  width: 44,
  height: 44,
  color: '#fff',
  bgcolor: 'rgba(255,255,255,0.12)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', color: '#fff' },
  '&:disabled': { color: 'rgba(255,255,255,0.32)', bgcolor: 'rgba(255,255,255,0.08)' },
} as const;

const navButtonSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  ...controlButtonSx,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function constrainZoom(next: Zoom, viewW: number, viewH: number, imgW: number, imgH: number): Zoom {
  const scale = clamp(next.scale, MIN_ZOOM, MAX_ZOOM);
  if (scale <= ZOOM_RESET_EPS) return IDENTITY;
  const maxX = Math.max(0, (imgW * scale - viewW) / 2);
  const maxY = Math.max(0, (imgH * scale - viewH) / 2);
  return {
    scale,
    x: clamp(next.x, -maxX, maxX),
    y: clamp(next.y, -maxY, maxY),
  };
}

function zoomToward(
  current: Zoom,
  nextScale: number,
  clientX: number,
  clientY: number,
  view: DOMRect,
  imgW: number,
  imgH: number,
): Zoom {
  const cx = view.left + view.width / 2;
  const cy = view.top + view.height / 2;
  const scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
  if (scale <= ZOOM_RESET_EPS) return IDENTITY;
  const ratio = scale / current.scale;
  return constrainZoom(
    {
      scale,
      x: clientX - cx - (clientX - cx - current.x) * ratio,
      y: clientY - cy - (clientY - cy - current.y) * ratio,
    },
    view.width,
    view.height,
    imgW,
    imgH,
  );
}

function pinchMetrics(points: Iterable<Point>) {
  const [a, b] = Array.from(points);
  if (!a || !b) return null;
  return {
    distance: Math.hypot(b.x - a.x, b.y - a.y),
    midX: (a.x + b.x) / 2,
    midY: (a.y + b.y) / 2,
  };
}

function isPointOnElement(el: HTMLElement | null, clientX: number, clientY: number) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

export function ImageLightbox({
  open,
  urls,
  index,
  alt = '',
  onClose,
  onIndexChange,
}: {
  open: boolean;
  urls: string[];
  index: number;
  alt?: string;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}) {
  useLockBodyScroll(open && urls.length > 0);

  const count = urls.length;
  const safeIndex = count === 0 ? 0 : ((index % count) + count) % count;
  const rawSrc = count > 0 ? urls[safeIndex] : '';
  const src = rawSrc ? (storageImageOriginalUrl(rawSrc) ?? rawSrc) : '';
  const hasMultiple = count > 1;

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const pointersRef = React.useRef(new Map<number, Point>());
  const dragStartRef = React.useRef<Point | null>(null);
  const lastPointRef = React.useRef<Point | null>(null);
  const lastPinchRef = React.useRef<{ distance: number } | null>(null);
  const didSwipeRef = React.useRef(false);
  const didPinchRef = React.useRef(false);
  const ignoreResetUntilRef = React.useRef(0);

  const [zoom, setZoom] = React.useState<Zoom>(IDENTITY);
  const [zoomSmooth, setZoomSmooth] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const zoomRef = React.useRef(zoom);
  zoomRef.current = zoom;
  const isZoomed = zoom.scale > ZOOM_RESET_EPS;

  const goTo = React.useCallback(
    (next: number) => {
      if (count === 0) return;
      onIndexChange?.(((next % count) + count) % count);
    },
    [count, onIndexChange],
  );

  const goPrevious = React.useCallback(() => {
    goTo(safeIndex - 1);
  }, [goTo, safeIndex]);

  const goNext = React.useCallback(() => {
    goTo(safeIndex + 1);
  }, [goTo, safeIndex]);

  const resetZoom = React.useCallback((smooth: boolean) => {
    setZoomSmooth(smooth);
    setZoom(IDENTITY);
  }, []);

  const measure = React.useCallback(() => {
    const viewport = viewportRef.current;
    const img = imgRef.current;
    if (!viewport || !img || img.offsetWidth < 1 || img.offsetHeight < 1) return null;
    return {
      view: viewport.getBoundingClientRect(),
      imgW: img.offsetWidth,
      imgH: img.offsetHeight,
    };
  }, []);

  const applyZoomAt = React.useCallback(
    (nextScale: number, clientX: number, clientY: number, smooth: boolean) => {
      const measured = measure();
      if (!measured) return;
      setZoomSmooth(smooth);
      setZoom(zoomToward(zoomRef.current, nextScale, clientX, clientY, measured.view, measured.imgW, measured.imgH));
    },
    [measure],
  );

  const zoomByStep = React.useCallback(
    (direction: 1 | -1) => {
      const measured = measure();
      if (!measured) return;
      const nextScale = direction > 0 ? zoomRef.current.scale * ZOOM_STEP : zoomRef.current.scale / ZOOM_STEP;
      applyZoomAt(
        nextScale,
        measured.view.left + measured.view.width / 2,
        measured.view.top + measured.view.height / 2,
        true,
      );
    },
    [applyZoomAt, measure],
  );

  const panBy = React.useCallback(
    (dx: number, dy: number) => {
      const measured = measure();
      if (!measured) return;
      setZoomSmooth(false);
      setZoom(
        constrainZoom(
          { scale: zoomRef.current.scale, x: zoomRef.current.x + dx, y: zoomRef.current.y + dy },
          measured.view.width,
          measured.view.height,
          measured.imgW,
          measured.imgH,
        ),
      );
    },
    [measure],
  );

  React.useEffect(() => {
    resetZoom(false);
  }, [open, safeIndex, resetZoom]);

  React.useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomByStep(1);
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        zoomByStep(-1);
      } else if (event.key === '0') {
        event.preventDefault();
        resetZoom(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrevious, open, resetZoom, zoomByStep]);

  React.useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!open || !el) return undefined;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0018);
      applyZoomAt(zoomRef.current.scale * factor, event.clientX, event.clientY, false);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoomAt, open, src]);

  const finishGesture = (event: React.PointerEvent<HTMLElement>, commitSwipe: boolean) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const start = dragStartRef.current;
    dragStartRef.current = null;
    lastPointRef.current = null;
    lastPinchRef.current = null;
    setIsPanning(false);

    if (!start || didPinchRef.current) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= TAP_MAX_PX) didSwipeRef.current = true;

    if (!commitSwipe || !hasMultiple || zoomRef.current.scale > ZOOM_RESET_EPS) return;
    if (distance < TAP_MAX_PX) return;
    if (Math.abs(dx) < SWIPE_COMMIT_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrevious();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    const pointers = pointersRef.current;
    if (pointers.size === 0) {
      didSwipeRef.current = false;
      didPinchRef.current = false;
      dragStartRef.current = { x: event.clientX, y: event.clientY };
    }

    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointers.size >= 2) {
      didPinchRef.current = true;
      lastPinchRef.current = pinchMetrics(pointers.values());
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const pinch = pinchMetrics(pointers.values());
      const last = lastPinchRef.current;
      if (pinch && last && last.distance > 0) {
        applyZoomAt(zoomRef.current.scale * (pinch.distance / last.distance), pinch.midX, pinch.midY, false);
      }
      lastPinchRef.current = pinch;
      return;
    }

    if (zoomRef.current.scale <= ZOOM_RESET_EPS) return;

    const last = lastPointRef.current;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    if (!last) return;
    setIsPanning(true);
    panBy(event.clientX - last.x, event.clientY - last.y);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    pointers.delete(event.pointerId);

    if (pointers.size === 1) {
      const remaining = pointers.values().next().value as Point | undefined;
      lastPinchRef.current = null;
      lastPointRef.current = remaining ?? null;
      return;
    }

    if (pointers.size === 0) {
      finishGesture(event, true);
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) {
      finishGesture(event, false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (didSwipeRef.current || didPinchRef.current || event.detail >= 2) return;

    const onImage = isPointOnElement(imgRef.current, event.clientX, event.clientY);
    const now = Date.now();

    if (onImage) {
      if (zoomRef.current.scale > ZOOM_RESET_EPS) {
        if (now < ignoreResetUntilRef.current) return;
        resetZoom(true);
        return;
      }
      applyZoomAt(TAP_ZOOM, event.clientX, event.clientY, true);
      ignoreResetUntilRef.current = now + IGNORE_RESET_MS;
      return;
    }

    if (zoomRef.current.scale > ZOOM_RESET_EPS) {
      if (now < ignoreResetUntilRef.current) return;
      resetZoom(true);
      return;
    }

    onClose();
  };

  return (
    <Dialog
      open={open && count > 0}
      onClose={onClose}
      fullScreen
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'rgba(0,0,0,0.96)',
            backgroundImage: 'none',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <IconButton
        type="button"
        onClick={onClose}
        aria-label="Mbyll pamjen e fotos"
        sx={{
          position: 'fixed',
          top: { xs: 'max(12px, env(safe-area-inset-top))', md: 16 },
          right: { xs: 'max(12px, env(safe-area-inset-right))', md: 16 },
          ...controlButtonSx,
        }}
      >
        <XIcon size={22} weight="bold" />
      </IconButton>

      {hasMultiple ? (
        <>
          <IconButton
            type="button"
            aria-label="Fotoja e mëparshme"
            onClick={goPrevious}
            sx={{ ...navButtonSx, left: { xs: 8, sm: 16 } }}
          >
            <CaretLeftIcon size={22} weight="bold" />
          </IconButton>
          <IconButton
            type="button"
            aria-label="Fotoja tjetër"
            onClick={goNext}
            sx={{ ...navButtonSx, right: { xs: 8, sm: 16 } }}
          >
            <CaretRightIcon size={22} weight="bold" />
          </IconButton>
        </>
      ) : null}

      <Stack
        spacing={0.75}
        sx={{
          position: 'fixed',
          right: { xs: 'max(12px, env(safe-area-inset-right))', md: 16 },
          bottom: { xs: 'max(16px, env(safe-area-inset-bottom))', md: 20 },
          zIndex: 3,
        }}
      >
        <IconButton
          type="button"
          aria-label="Zmadho foton"
          disabled={zoom.scale >= MAX_ZOOM - 0.01}
          onClick={() => zoomByStep(1)}
          sx={controlButtonSx}
        >
          <PlusIcon size={20} weight="bold" />
        </IconButton>
        <IconButton
          type="button"
          aria-label="Zvogëlo foton"
          disabled={!isZoomed}
          onClick={() => zoomByStep(-1)}
          sx={controlButtonSx}
        >
          <MinusIcon size={20} weight="bold" />
        </IconButton>
      </Stack>

      <Box
        ref={viewportRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          p: { xs: 1.5, md: 3 },
          cursor: isPanning ? 'grabbing' : isZoomed ? 'grab' : 'zoom-in',
          position: 'relative',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            draggable={false}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: isZoomed ? 0 : 8,
              userSelect: 'none',
              pointerEvents: 'none',
              transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
              transformOrigin: 'center center',
              transition: zoomSmooth ? 'transform 160ms ease' : 'none',
              willChange: 'transform',
            }}
          />
        ) : null}
      </Box>

      {hasMultiple ? (
        <Typography
          component="span"
          sx={{
            position: 'fixed',
            bottom: { xs: 'max(16px, env(safe-area-inset-bottom))', md: 20 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            bgcolor: 'rgba(0,0,0,0.55)',
            color: '#fff',
            pointerEvents: 'none',
          }}
        >
          {`${safeIndex + 1} / ${count}`}
        </Typography>
      ) : null}
    </Dialog>
  );
}

/** Object URLs for local `File`s — revoked when the file list changes. */
export function useObjectUrls(files: File[]): string[] {
  const [urls, setUrls] = React.useState<string[]>([]);
  const filesRef = React.useRef(files);
  filesRef.current = files;
  const signature = files.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join('|');

  React.useEffect(() => {
    const created = filesRef.current.map((file) => URL.createObjectURL(file));
    setUrls(created);
    return () => {
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [signature]);

  return urls;
}
