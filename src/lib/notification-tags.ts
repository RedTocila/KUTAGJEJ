import type { NotificationPreferences } from '@/lib/user-notifications-client';

export type NotificationTag = keyof NotificationPreferences;

/** Inbox chips on the main notifications page (leads live on /leads). */
export const NOTIFICATION_TAGS = [
  'messages',
  'listing_status',
  'reviews',
  'reservations',
] as const satisfies readonly NotificationTag[];

/** Grow/Elite leads inbox: saves + shares + hot interest. */
export const LEAD_NOTIFICATION_TAGS = [
  'listing_saved',
  'listing_shared',
  'listing_hot_lead',
] as const satisfies readonly NotificationTag[];

const TYPE_TO_TAG: Record<string, NotificationTag> = {
  new_message: 'messages',
  listing_saved: 'listing_saved',
  listing_shared: 'listing_shared',
  listing_hot_lead: 'listing_hot_lead',
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
  const tag = notificationTagForType(type);
  return tag === 'listing_saved' || tag === 'listing_shared' || tag === 'listing_hot_lead';
}
