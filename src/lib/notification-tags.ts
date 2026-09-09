import type { NotificationPreferences } from '@/lib/user-notifications-client';

export type NotificationTag = keyof NotificationPreferences;

/** Inbox chips on the main notifications page. */
export const NOTIFICATION_TAGS = [
  'messages',
  'listing_status',
  'reviews',
  'reservations',
] as const satisfies readonly NotificationTag[];

/** Retired Grow/Elite lead notification types (filtered out of the main inbox). */
const RETIRED_LEAD_TYPES = new Set(['listing_saved', 'listing_shared', 'listing_hot_lead']);

const TYPE_TO_TAG: Record<string, NotificationTag> = {
  new_message: 'messages',
  listing_approved: 'listing_status',
  listing_rejected: 'listing_status',
  member_review: 'reviews',
  listing_review: 'reviews',
  business_reservation: 'reservations',
  // Account verification shares the Status inbox chip with listing approve/reject.
  verification_approved: 'listing_status',
  verification_rejected: 'listing_status',
};

export function notificationTagForType(type: string): NotificationTag | null {
  return TYPE_TO_TAG[type] ?? null;
}

export function isLeadNotificationType(type: string): boolean {
  return RETIRED_LEAD_TYPES.has(type);
}
