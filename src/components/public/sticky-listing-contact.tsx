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
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    setHost(document.body);
  }, []);

  const bar = (
    <Box
      sx={(theme) => ({
        display: showOnDesktop ? 'flex' : { xs: 'flex', md: 'none' },
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

  if (!host) return null;
  return createPortal(bar, host);
}
