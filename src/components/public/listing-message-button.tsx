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
  const { user } = useUser();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    if (!user) {
      setPendingListingChat({ listingKind, listingId });
      router.push(paths.user.auth);
      return;
    }

    setLoading(true);
    const res = await startConversation(listingKind, listingId);
    setLoading(false);
    if (res.error || !res.conversation) {
      setError(res.error ?? 'Nuk u krijua biseda.');
      return;
    }
    router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}`);
  };

  return (
    <>
      <Button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || loading}
      title={error && !buttonProps.fullWidth ? error : buttonProps.title}
      startIcon={
        loading
          ? <CircularProgress size={18} color="inherit" />
          : startIcon ?? (children ? undefined : <ChatsCircleIcon weight="regular" size={20} />)
      }
      {...buttonProps}
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
