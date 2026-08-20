'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import { Suspense } from 'react';

import { ListingCardsSkeleton } from '@/components/core/content-skeletons';
import type { CloseSearchOptions } from '@/contexts/search-overlay-context';
import { useCopy } from '@/hooks/use-copy';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { isModifiedClick } from '@/lib/navigate-back';
import { MOTION } from '@/styles/motion';

import { SearchPageView } from './search-page-view';

function parseMs(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 240;
}

const ENTER_MS = parseMs(MOTION.enter) + 80;
const EXIT_MS = parseMs(MOTION.base) + 60;

function SearchOverlayFallback() {
  return (
    <Box sx={{ px: 2, py: 3 }}>
      <ListingCardsSkeleton count={6} />
    </Box>
  );
}

export function SearchOverlay({
  open,
  immediateClose = false,
  onClose,
}: {
  open: boolean;
  immediateClose?: boolean;
  onClose: (options?: CloseSearchOptions) => void;
}) {
  const router = useRouter();
  const t = useCopy();
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  const [mounted, setMounted] = React.useState(open);
  const [entered, setEntered] = React.useState(false);

  React.useEffect(() => {
    setHost(document.body);
  }, []);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        setEntered(true);
        return undefined;
      }
      let frame2 = 0;
      const frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(frame1);
        cancelAnimationFrame(frame2);
      };
    }

    if (immediateClose || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEntered(false);
      setMounted(false);
      return undefined;
    }

    setEntered(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, immediateClose]);

  useLockBodyScroll(open && mounted);

  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleInternalLink = (event: React.MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    if (isModifiedClick(event)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const nestedInteractive = target.closest('button, [role="button"], input, select, textarea');
    const anchor = target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (nestedInteractive && nestedInteractive !== anchor && anchor.contains(nestedInteractive)) return;
    if (anchor.hasAttribute('download')) return;
    if (anchor.target && anchor.target !== '_self') return;

    let url: URL;
    try {
      url = new URL(anchor.href);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin) return;

    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;

    event.preventDefault();
    onClose({ immediate: true, replaceHistory: true });
    router.replace(next);
  };

  if (!host || !mounted) return null;

  return createPortal(
    <>
      <Box
        aria-hidden
        onClick={() => onClose()}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: (theme) => theme.zIndex.modal + 8,
          bgcolor: 'rgba(0,0,0,0.45)',
          opacity: entered ? 1 : 0,
          pointerEvents: entered ? 'auto' : 'none',
          transition: `opacity ${ENTER_MS}ms ${MOTION.ease}`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      />
      <Box
        role="dialog"
        aria-modal="true"
        aria-label={t.search.title}
        data-scroll-lock-allow=""
        onClickCapture={handleInternalLink}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: (theme) => theme.zIndex.modal + 9,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          transform: entered ? 'translate3d(0, 0, 0)' : 'translate3d(0, 100%, 0)',
          transition: `transform ${entered ? ENTER_MS : EXIT_MS}ms ${MOTION.ease}`,
          willChange: 'transform',
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none',
            transition: 'none',
          },
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Suspense fallback={<SearchOverlayFallback />}>
            <SearchPageView
              variant="overlay"
              onClose={() => onClose()}
              onNavigate={() => onClose({ immediate: true, replaceHistory: true })}
            />
          </Suspense>
        </Box>
      </Box>
    </>,
    host,
  );
}
