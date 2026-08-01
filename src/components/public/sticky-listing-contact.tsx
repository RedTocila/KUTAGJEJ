'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

import { useUser } from '@/hooks/use-user';
import {
  type ConversationListingKind,
  setPendingListingChat,
  startConversation,
} from '@/lib/conversations-client';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { paths } from '@/paths';

export interface StickyListingContactProps {
  listingKind: ConversationListingKind;
  listingId: string;
}

function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('custom-auth-token'));
}

export function StickyListingContact({ listingKind, listingId }: StickyListingContactProps) {
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
        // Session expired — send to login, keep intended chat.
        if (/auth required|invalid token|çaktivizuar/i.test(message)) {
          setPendingListingChat({ listingKind, listingId });
          router.push(paths.user.auth);
          return;
        }
        setError(message);
        return;
      }
      router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'fixed',
        right: 0,
        zIndex: 1200,
        bottom: MOBILE_BOTTOM_NAV_OFFSET,
        justifyContent: 'flex-end',
        px: { xs: 1.5, sm: 3 },
        py: 1.25,
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
        <Button
          type="button"
          variant="contained"
          disableElevation
          size="large"
          disabled={loading || isLoading}
          onClick={() => void openChat()}
          startIcon={loading || isLoading ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{
            minWidth: 148,
            height: 52,
            borderRadius: 999,
            fontWeight: 800,
            textTransform: 'none',
            fontSize: '0.95rem',
            color: 'common.black',
            boxShadow: 'none',
            px: 3,
            '&:hover': { color: 'common.black' },
            '& .MuiButton-startIcon': { color: 'inherit' },
          }}
        >
          Contact
        </Button>
        {error ? (
          <Typography variant="caption" color="error" sx={{ fontWeight: 600, maxWidth: 220, textAlign: 'right' }}>
            {error}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
