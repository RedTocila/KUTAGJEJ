import type { NotificationPreferences } from '@/lib/user-notifications-client';

export type NotificationTag = keyof NotificationPreferences;

export const NOTIFICATION_TAGS: NotificationTag[] = [
  'messages',
  'listing_saved',
  'listing_status',
  'reviews',
  'reservations',
  'verification',
];

const TYPE_TO_TAG: Record<string, NotificationTag> = {
  new_message: 'messages',
  listing_saved: 'listing_saved',
  listing_approved: 'listing_status',
  listing_rejected: 'listing_status',
  member_review: 'reviews',
  business_reservation: 'reservations',
  verification_approved: 'verification',
  verification_rejected: 'verification',
};

export function notificationTagForType(type: string): NotificationTag | null {
  return TYPE_TO_TAG[type] ?? null;
}
