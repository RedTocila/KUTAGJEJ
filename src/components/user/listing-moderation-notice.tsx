'use client';

import { Alert } from '@mui/material';

import {
  listingModerationStatusMessage,
  LISTING_SUBMITTED_PENDING_MESSAGE,
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
    <Alert severity="success" sx={{ borderRadius: 1.5 }}>
      {LISTING_SUBMITTED_PENDING_MESSAGE}
    </Alert>
  );
}
