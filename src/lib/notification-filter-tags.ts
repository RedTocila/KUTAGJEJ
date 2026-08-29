'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { ChatCircle as ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { Fire as FireIcon } from '@phosphor-icons/react/dist/ssr/Fire';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { SealCheck as SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';

import type { ProductTagAccent } from '@/components/public/product-browse-chrome';
import type { NotificationTag } from '@/lib/notification-tags';

/** Leads header CTA — same pill chrome as subcategory tags, cyan accent. */
export const LEADS_BUTTON_ACCENT: ProductTagAccent = {
  color: '#3ec6e0',
  soft: 'rgba(62, 198, 224, 0.18)',
};

export const LEADS_BUTTON_ICON = UsersThreeIcon;

const FILTER_ICONS: Record<string, PhosphorIcon> = {
  all: ListBulletsIcon,
  messages: ChatCircleIcon,
  listing_saved: BookmarkSimpleIcon,
  listing_shared: PaperPlaneTiltIcon,
  listing_hot_lead: FireIcon,
  listing_status: SealCheckIcon,
  reviews: StarIcon,
  reservations: CalendarBlankIcon,
};

export function notificationFilterIcon(key: 'all' | NotificationTag): PhosphorIcon {
  return FILTER_ICONS[key] ?? ListBulletsIcon;
}
