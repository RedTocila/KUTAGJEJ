'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, CircularProgress, Typography, type ButtonProps } from '@mui/material';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';

import { useUser } from '@/hooks/use-user';
import {
  type ConversationListingKind,
  setPendingListingChat,
  startConversation,
} from '@/lib/conversations-client';
import { paths } from '@/paths';

export interface ListingMessageButtonProps extends Omit<ButtonProps, 'onClick'> {
  listingKind: ConversationListingKind;
  listingId: string;
  label?: string;
  children?: React.ReactNode;
}

export function ListingMessageButton({
  listingKind,
  listingId,
  label = 'Dërgo mesazh',
  disabled,
  startIcon,
  children,
  ...buttonProps
}: ListingMessageButtonProps) {
  const router = useRouter();
  const { user, isLoading, checkSession } = useUser();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    if (isLoading) return;

    const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('custom-auth-token'));
    if (!user && !hasToken) {
      setPendingListingChat({ listingKind, listingId });
      router.push(paths.user.auth);
      return;
    }

    if (!user && hasToken) {
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
      router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || loading || isLoading}
      title={error && !buttonProps.fullWidth ? error : buttonProps.title}
      startIcon={
        loading || isLoading
          ? <CircularProgress size={18} color="inherit" />
          : startIcon ?? (children ? undefined : <ChatsCircleIcon weight="regular" size={20} />)
      }
      {...buttonProps}
      data-listing-contact=""
    >
      {children ?? label}
    </Button>
    {error && buttonProps.fullWidth ? (
      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
        {error}
      </Typography>
    ) : null}
    </>
  );
}
