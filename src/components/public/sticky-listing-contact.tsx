'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Box, type SxProps, type Theme } from '@mui/material';

import { ListingMessageButton } from '@/components/public/listing-message-button';
import { type ConversationListingKind } from '@/lib/conversations-client';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';

/** Shared “Kontakto” CTA — full width across listing detail surfaces. */
export const listingContactCtaSx: SxProps<Theme> = {
  height: 52,
  minWidth: 0,
  width: '100%',
  borderRadius: 999,
  fontWeight: 800,
  textTransform: 'none',
  fontSize: '0.95rem',
  color: 'primary.contrastText',
  bgcolor: 'primary.main',
  backgroundImage: 'none',
  boxShadow: 'none',
  px: 3.25,
  transition: 'background-color 160ms ease, transform 160ms ease',
  '&:hover': {
    bgcolor: 'primary.dark',
    color: 'primary.contrastText',
    boxShadow: 'none',
    filter: 'none',
  },
  '&:active': {
    transform: 'scale(0.98)',
    filter: 'none',
  },
  '&.Mui-disabled': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    opacity: 0.75,
  },
  '& .MuiButton-startIcon': { color: 'inherit', mr: 0.85 },
};

/** In-flow slot height (button) so layout does not jump when the CTA pins. */
export const LISTING_CTA_SLOT_HEIGHT_PX = 52;

/** Slide duration when the CTA pins / unpins above the mobile nav. */
const CTA_PIN_MS = 320;
const CTA_PIN_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface StickyListingCtaSlotProps {
  children: React.ReactNode;
  /** When true, also show on `md+`. Default: mobile only. */
  showOnDesktop?: boolean;
  /** Min height for the in-flow slot while unpinned. Default: pill button height. */
  slotMinHeight?: number | string;
}

/** Shared sticky slot — pins children above the mobile nav after scroll. */
export function StickyListingCtaSlot({
  children,
  showOnDesktop = false,
  slotMinHeight = LISTING_CTA_SLOT_HEIGHT_PX,
}: StickyListingCtaSlotProps) {
  const slotRef = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const [entered, setEntered] = React.useState(false);
  const [host, setHost] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setHost(document.body);
  }, []);

  React.useEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: '0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const reduce = prefersReducedMotion();

    if (stuck) {
      setPinned(true);
      if (reduce) {
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

    setEntered(false);
    if (reduce) {
      setPinned(false);
      return undefined;
    }
    const timeout = window.setTimeout(() => setPinned(false), CTA_PIN_MS);
    return () => window.clearTimeout(timeout);
  }, [stuck]);

  const displaySx = showOnDesktop ? 'flex' : { xs: 'flex', md: 'none' };
  const inPortal = pinned;

  const fixedBar =
    inPortal && host
      ? createPortal(
          <Box
            sx={(theme) => ({
              display: displaySx,
              position: 'fixed',
              left: 0,
              right: 0,
              zIndex: theme.zIndex.appBar + 10,
              bottom: MOBILE_BOTTOM_NAV_OFFSET,
              px: 2,
              py: 1.25,
              justifyContent: 'stretch',
              pointerEvents: 'none',
              bgcolor: 'transparent',
              backgroundImage: 'none',
              opacity: entered ? 1 : 0,
              transform: entered ? 'translate3d(0, 0, 0)' : 'translate3d(0, calc(100% + 12px), 0)',
              transition: `transform ${CTA_PIN_MS}ms ${CTA_PIN_EASING}, opacity ${CTA_PIN_MS}ms ${CTA_PIN_EASING}`,
              willChange: 'transform, opacity',
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
                transform: 'none',
                opacity: 1,
              },
              '& > *': { pointerEvents: entered ? 'auto' : 'none' },
            })}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 0.5,
                width: '100%',
                maxWidth: '100%',
                maxHeight: 'min(70vh, calc(100dvh - 120px))',
                overflowY: 'auto',
              }}
            >
              {children}
            </Box>
          </Box>,
          host,
        )
      : null;

  return (
    <>
      <Box
        ref={slotRef}
        sx={{
          display: displaySx,
          flexDirection: 'column',
          width: '100%',
          minHeight: slotMinHeight,
          alignItems: 'stretch',
          '& > *': { width: '100%', maxWidth: '100%' },
        }}
      >
        {inPortal ? null : children}
      </Box>
      {fixedBar}
    </>
  );
}

export interface StickyListingContactProps {
  listingKind: ConversationListingKind;
  listingId: string;
  /** Defaults to “Kontakto”. */
  label?: string;
  /**
   * When true, also show on `md+`.
   * Default: mobile only.
   */
  showOnDesktop?: boolean;
  contactPhone?: string | null;
  listingTitle?: string | null;
  listingUrl?: string | null;
}

/**
 * In-flow “Kontakto” CTA that pins to the bottom of the screen (above the mobile
 * nav) once its natural position scrolls past the top of the viewport.
 * The pinned bar slides up from the nav and slides back down when you return.
 */
export function StickyListingContact({
  listingKind,
  listingId,
  label = 'Kontakto',
  showOnDesktop = false,
  contactPhone,
  listingTitle,
  listingUrl,
}: StickyListingContactProps) {
  const renderButton = () => (
    <ListingMessageButton
      listingKind={listingKind}
      listingId={listingId}
      contactPhone={contactPhone}
      listingTitle={listingTitle}
      listingUrl={listingUrl}
      label={label}
      variant="contained"
      disableElevation
      size="large"
      fullWidth
      sx={listingContactCtaSx}
    />
  );

  return <StickyListingCtaSlot showOnDesktop={showOnDesktop}>{renderButton()}</StickyListingCtaSlot>;
}
