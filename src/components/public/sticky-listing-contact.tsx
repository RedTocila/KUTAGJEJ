'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, CircularProgress, Typography, type SxProps, type Theme } from '@mui/material';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';

import { useUser } from '@/hooks/use-user';
import {
  type ConversationListingKind,
  setPendingListingChat,
  startConversation,
} from '@/lib/conversations-client';
import { emitHotLeadContactAction } from '@/lib/listing-hot-lead';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { paths } from '@/paths';

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
  '&:hover': {
    color: 'primary.contrastText',
    boxShadow: '0 12px 32px rgba(0,0,0,0.34)',
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
}

function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('custom-auth-token'));
}

/** Shared sticky CTA — full-width bar with chat icon (all listing categories). */
export function StickyListingContact({
  listingKind,
  listingId,
  label = 'Kontakto',
  showOnDesktop = false,
}: StickyListingContactProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const { user, isLoading, checkSession } = useUser();

  const openChat = async () => {
    setError(null);
    if (isLoading) return;

    if (!user && !hasStoredSession()) {
      setPendingListingChat({ listingKind, listingId });
      router.push(paths.user.auth);
      return;
    }

    if (!user && hasStoredSession()) {
      await checkSession();
    }

    setLoading(true);
    try {
      const res = await startConversation(listingKind, listingId);
      if (res.error || !res.conversation) {
        const message = res.error ?? 'Nuk u krijua biseda.';
        if (/auth required|invalid token|çaktivizuar/i.test(message)) {
          setPendingListingChat({ listingKind, listingId });
          router.push(paths.user.auth);
          return;
        }
        setError(message);
        return;
      }
      emitHotLeadContactAction({ listingKind, listingId });
      router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}`);
    } finally {
      setLoading(false);
    }
  };

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
        <Button
          type="button"
          variant="contained"
          disableElevation
          size="large"
          fullWidth
          disabled={loading || isLoading}
          onClick={() => void openChat()}
          startIcon={
            loading || isLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <ChatsCircleIcon weight="regular" size={22} />
            )
          }
          sx={listingContactCtaSx}
        >
          {label}
        </Button>
        {error ? (
          <Typography variant="caption" color="error" sx={{ fontWeight: 600, textAlign: 'center' }}>
            {error}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
