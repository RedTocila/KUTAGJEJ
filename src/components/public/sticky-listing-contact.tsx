'use client';

import * as React from 'react';
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
  boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
  px: 3.25,
  transition: `background-color 120ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 120ms cubic-bezier(0.22, 1, 0.36, 1), transform 140ms cubic-bezier(0.22, 1, 0.36, 1), filter 120ms ease`,
  '&:hover': {
    color: 'primary.contrastText',
    boxShadow: '0 12px 32px rgba(0,0,0,0.34)',
  },
  '&:active': {
    transform: 'scale(0.98)',
    filter: 'brightness(0.94)',
    transitionDuration: '0ms',
  },
  '& .MuiButton-startIcon': { color: 'inherit', mr: 0.85 },
};

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

/** Shared sticky CTA — full-width bar with chat icon (all listing categories). */
export function StickyListingContact({
  listingKind,
  listingId,
  label = 'Kontakto',
  showOnDesktop = false,
  contactPhone,
  listingTitle,
  listingUrl,
}: StickyListingContactProps) {
  return (
    <Box
      sx={{
        display: showOnDesktop ? 'flex' : { xs: 'flex', md: 'none' },
        position: 'fixed',
        left: 0,
        right: 0,
        zIndex: 1200,
        bottom: MOBILE_BOTTOM_NAV_OFFSET,
        px: 2,
        py: 1.25,
        justifyContent: 'stretch',
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.5,
          width: '100%',
          maxWidth: '100%',
        }}
      >
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
      </Box>
    </Box>
  );
}
