'use client';

import { Alert } from '@mui/material';

import { TransientSuccessAlert } from '@/components/core/transient-success-alert';
import {
  listingModerationStatusMessage,
  LISTING_SUBMITTED_LIVE_MESSAGE,
  normalizeListingModerationStatus,
  type ListingModerationStatus,
} from '@/lib/listing-moderation-status';

export function ListingModerationNotice({
  status,
}: {
  status: ListingModerationStatus | string | null | undefined;
}) {
  const normalized = normalizeListingModerationStatus(status ?? undefined);
  const message = listingModerationStatusMessage(normalized);
  if (!message) return null;
  return (
    <Alert severity={normalized === 'rejected' ? 'error' : 'warning'} sx={{ borderRadius: 1.5 }}>
      {message}
    </Alert>
  );
}

export function ListingSubmittedPendingAlert() {
  return (
    <TransientSuccessAlert message={LISTING_SUBMITTED_LIVE_MESSAGE} sx={{ borderRadius: 1.5 }} />
  );
}
