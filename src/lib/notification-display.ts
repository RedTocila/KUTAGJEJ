import type { UserNotification } from '@/lib/user-notifications-client';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
  paths,
} from '@/paths';

export type NotificationGroup = {
  /** Primary (newest) notification in the group. */
  primary: UserNotification;
  /** All ids (newest first) — mark all read when opening a stacked message. */
  ids: string[];
  /** How many raw notifications were merged (messages from same sender). */
  count: number;
  /** True if any notification in the group is unread. */
  unread: boolean;
};

/** Collapse `new_message` rows from the same actor into one card. */
export function groupUserNotifications(items: UserNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const messageGroupByActor = new Map<string, NotificationGroup>();

  for (const item of items) {
    if (item.type === 'new_message' && item.actorId) {
      const existing = messageGroupByActor.get(item.actorId);
      if (existing) {
        existing.ids.push(item.id);
        existing.count += 1;
        if (!item.readAt) existing.unread = true;
        continue;
      }
      const group: NotificationGroup = {
        primary: item,
        ids: [item.id],
        count: 1,
        unread: !item.readAt,
      };
      messageGroupByActor.set(item.actorId, group);
      groups.push(group);
      continue;
    }
    groups.push({
      primary: item,
      ids: [item.id],
      count: 1,
      unread: !item.readAt,
    });
  }

  return groups;
}

/** Strip legacy “open my listings” CTA from older save notifications. */
export function notificationDisplayMessage(item: UserNotification): string {
  if (item.type !== 'listing_saved') return item.message;
  return item.message.replace(/\s*Hap njoftimet e mia për të kontaktuar\.?\s*$/i, '').trim();
}

export function listingHrefFromNotification(item: UserNotification): string | null {
  if (!item.refId) return null;
  if (item.href && !item.href.includes('shpalljet-e-mia')) return item.href;

  const entry = { id: item.refId, permalinkPath: null as string | null };
  switch (item.refKind) {
    case 'real-estate':
      return listingRealEstatePublicHref(entry);
    case 'car':
      return listingCarPublicHref(entry);
    case 'job':
      return listingJobPublicHref(entry);
    case 'marketplace':
      return listingMarketplacePublicHref(entry);
    case 'businesses':
      return listingBusinessPublicHref(entry);
    case 'professionals':
      return listingProfessionalPublicHref(entry);
    default:
      return null;
  }
}

export function messageHrefFromNotification(item: UserNotification): string {
  if (item.href) return item.href;
  if (item.refId) return `${paths.user.messages}?c=${encodeURIComponent(item.refId)}`;
  return paths.user.messages;
}
