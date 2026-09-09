'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { ChatCircle as ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { SealCheck as SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';

import type { NotificationTag } from '@/lib/notification-tags';

const FILTER_ICONS: Record<string, PhosphorIcon> = {
  all: ListBulletsIcon,
  messages: ChatCircleIcon,
  listing_status: SealCheckIcon,
  reviews: StarIcon,
  reservations: CalendarBlankIcon,
};

export function notificationFilterIcon(key: 'all' | NotificationTag): PhosphorIcon {
  return FILTER_ICONS[key] ?? ListBulletsIcon;
}
