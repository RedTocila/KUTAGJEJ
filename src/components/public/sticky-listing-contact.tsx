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
  transition: 'none',
  '&:hover': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    boxShadow: 'none',
    filter: 'none',
  },
  '&:active': {
    transform: 'none',
    filter: 'none',
  },
  '& .MuiButton-startIcon': { color: 'inherit', mr: 0.85 },
};

/** In-flow slot height (button) so layout does not jump when the CTA pins. */
export const LISTING_CTA_SLOT_HEIGHT_PX = 52;

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

  const displaySx = showOnDesktop ? 'flex' : { xs: 'flex', md: 'none' };

  const fixedBar =
    stuck && host
      ? createPortal(
          <Box
            sx={(theme) => ({
              display: displaySx,
              position: 'fixed',
              left: 0,
              right: 0,
              zIndex: theme.zIndex.modal - 10,
              bottom: MOBILE_BOTTOM_NAV_OFFSET,
              px: 2,
              py: 1.25,
              justifyContent: 'stretch',
              pointerEvents: 'none',
              bgcolor: 'transparent',
              backgroundImage: 'none',
              '& > *': { pointerEvents: 'auto' },
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
        {stuck ? null : children}
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
