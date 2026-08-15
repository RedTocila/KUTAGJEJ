'use client';

import * as React from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

const SWIPE_COMMIT_PX = 56;
const TAP_MAX_PX = 12;

const navButtonSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  width: 44,
  height: 44,
  color: '#fff',
  bgcolor: 'rgba(255,255,255,0.12)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', color: '#fff' },
} as const;

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
  const src = count > 0 ? urls[safeIndex] : '';
  const hasMultiple = count > 1;

  const dragStartRef = React.useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const didSwipeRef = React.useRef(false);

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

  React.useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrevious, open]);

  const finishPointer = (event: React.PointerEvent<HTMLElement>, commitSwipe: boolean) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    dragStartRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= TAP_MAX_PX) didSwipeRef.current = true;

    if (!commitSwipe || !hasMultiple) return;
    if (distance < TAP_MAX_PX) return;
    if (Math.abs(dx) < SWIPE_COMMIT_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrevious();
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
          zIndex: 3,
          width: 44,
          height: 44,
          color: '#fff',
          bgcolor: 'rgba(255,255,255,0.12)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', color: '#fff' },
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

      <Box
        onClick={() => {
          if (didSwipeRef.current) return;
          onClose();
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          didSwipeRef.current = false;
          dragStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => finishPointer(event, true)}
        onPointerCancel={(event) => finishPointer(event, false)}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          p: { xs: 1.5, md: 3 },
          cursor: 'zoom-out',
          position: 'relative',
          touchAction: hasMultiple ? 'pan-y' : 'auto',
          userSelect: 'none',
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
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
              borderRadius: 8,
              userSelect: 'none',
              pointerEvents: 'none',
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
