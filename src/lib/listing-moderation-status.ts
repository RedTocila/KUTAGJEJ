export type ListingModerationStatus = 'pending' | 'approved' | 'rejected';

export const LISTING_MODERATION_STATUS_LABELS: Record<ListingModerationStatus, string> = {
  pending: 'Në pritje',
  approved: 'Aktive',
  rejected: 'Refuzuar',
};

export function normalizeListingModerationStatus(
  status: string | null | undefined,
): ListingModerationStatus {
  if (status === 'approved' || status === 'rejected') return status;
  return 'pending';
}

export function listingModerationStatusMessage(status: ListingModerationStatus): string | null {
  if (status === 'pending') {
    return 'Njoftimi juaj është në shqyrtim dhe nuk shfaqet ende publikisht.';
  }
  if (status === 'rejected') {
    return 'Njoftimi u heq nga platforma nga administratori. Kontaktoni mbështetjen për më shumë detaje.';
  }
  return null;
}

export const LISTING_SUBMITTED_LIVE_MESSAGE =
  'Njoftimi u publikua me sukses dhe është aktiv tani.';

/** @deprecated Use LISTING_SUBMITTED_LIVE_MESSAGE */
export const LISTING_SUBMITTED_PENDING_MESSAGE = LISTING_SUBMITTED_LIVE_MESSAGE;
