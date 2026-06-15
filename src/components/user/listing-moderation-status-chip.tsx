'use client';

import { Chip } from '@mui/material';

import {
  LISTING_MODERATION_STATUS_LABELS,
  normalizeListingModerationStatus,
  type ListingModerationStatus,
} from '@/lib/listing-moderation-status';

function chipColor(status: ListingModerationStatus): 'warning' | 'success' | 'error' | 'default' {
  if (status === 'pending') return 'warning';
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'error';
  return 'default';
}

export function ListingModerationStatusChip({
  status,
  size = 'small',
}: {
  status: ListingModerationStatus | string | null | undefined;
  size?: 'small' | 'medium';
}) {
  const normalized = normalizeListingModerationStatus(status ?? undefined);
  return (
    <Chip
      size={size}
      label={LISTING_MODERATION_STATUS_LABELS[normalized]}
      color={chipColor(normalized)}
      variant={normalized === 'approved' ? 'outlined' : 'filled'}
      sx={{ fontWeight: 700 }}
    />
  );
}
