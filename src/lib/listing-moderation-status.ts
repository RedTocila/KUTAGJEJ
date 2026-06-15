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
    return 'Njoftimi juaj pret miratimin e administratorit përpara se të shfaqet publikisht.';
  }
  if (status === 'rejected') {
    return 'Njoftimi u refuzua nga administratori. Kontaktoni mbështetjen për më shumë detaje.';
  }
  return null;
}

export const LISTING_SUBMITTED_PENDING_MESSAGE =
  'Njoftimi u dërgua me sukses dhe pret miratimin e administratorit. Do ta shihni këtu me statusin "Në pritje".';
