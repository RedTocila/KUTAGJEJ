'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, CircularProgress, Typography, type ButtonProps } from '@mui/material';
import { ChatCircle as ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';

import { GuestListingContactDialog } from '@/components/public/guest-listing-contact-dialog';
import { useUser } from '@/hooks/use-user';
import {
  type ConversationListingKind,
  setPendingListingChat,
  startConversation,
} from '@/lib/conversations-client';
import { emitHotLeadContactAction } from '@/lib/listing-hot-lead';
import { paths } from '@/paths';
import { hasStoredAccessToken } from '@/lib/auth/storage';

export interface ListingMessageButtonProps extends Omit<ButtonProps, 'onClick'> {
  listingKind: ConversationListingKind;
  listingId: string;
  label?: string;
  children?: React.ReactNode;
  /** Seller phone — used in the guest contact popup (call / WhatsApp). */
  contactPhone?: string | null;
  listingTitle?: string | null;
  listingUrl?: string | null;
}

function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false;
  return hasStoredAccessToken();
}

export function ListingMessageButton({
  listingKind,
  listingId,
  label = 'Dërgo mesazh',
  disabled,
  startIcon,
  children,
  contactPhone,
  listingTitle,
  listingUrl,
  ...buttonProps
}: ListingMessageButtonProps) {
  const router = useRouter();
  const { user, isLoading, checkSession } = useUser();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [guestOpen, setGuestOpen] = React.useState(false);

  const goToAuth = React.useCallback(() => {
    setPendingListingChat({ listingKind, listingId, withInquiry: true });
    setGuestOpen(false);
    router.push(paths.user.auth);
  }, [listingId, listingKind, router]);

  const handleClick = async () => {
    setError(null);
    if (loading) return;

    if (isLoading) {
      await checkSession();
    }

    if (!user && !hasStoredSession()) {
      setGuestOpen(true);
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
          goToAuth();
          return;
        }
        setError(message);
        return;
      }
      emitHotLeadContactAction({ listingKind, listingId });
      const inquiry = encodeURIComponent(`${listingKind}:${listingId}`);
      router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}&inquiry=${inquiry}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        {...buttonProps}
        onClick={() => void handleClick()}
        disabled={disabled || loading}
        title={error && !buttonProps.fullWidth ? error : buttonProps.title}
        startIcon={
          loading ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            startIcon ?? (children ? undefined : <ChatCircleIcon weight="bold" size={20} />)
          )
        }
        data-listing-contact=""
      >
        {children ?? label}
      </Button>
      {error && buttonProps.fullWidth ? (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
          {error}
        </Typography>
      ) : null}
      <GuestListingContactDialog
        open={guestOpen}
        onClose={() => setGuestOpen(false)}
        onOpenAccount={goToAuth}
        contactPhone={contactPhone}
        listingTitle={listingTitle}
        listingUrl={listingUrl}
        listingKind={listingKind}
        listingId={listingId}
      />
    </>
  );
}
