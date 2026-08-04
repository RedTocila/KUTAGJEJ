'use client';

import type { ListingMetricKind } from '@/lib/listing-metrics';

/** Spec icons supported by the Instagram story template. */
export type ListingShareSpecIcon =
  | 'bed'
  | 'bath'
  | 'ruler'
  | 'stairs'
  | 'calendar'
  | 'couch'
  | 'car'
  | 'gauge'
  | 'gas'
  | 'gear'
  | 'paint'
  | 'tag'
  | 'check'
  | 'sparkle'
  | 'clock'
  | 'briefcase'
  | 'buildings'
  | 'house'
  | 'star'
  | 'graduation'
  | 'map-pin'
  | 'storefront'
  | 'path';

export type ListingShareSpec = {
  icon: ListingShareSpecIcon;
  label: string;
};

/** Payload used to render the share sheet + Instagram story card. */
export type ListingSharePayload = {
  listingKind: ListingMetricKind;
  listingId: string;
  title: string;
  category?: string;
  priceLabel?: string;
  badge?: string;
  imageUrl?: string | null;
  location?: string;
  specs?: ListingShareSpec[];
  createdAt?: string | null;
  viewCount?: number;
  saveCount?: number;
  /** Absolute or path URL; defaults to current page. */
  url?: string;
};

export const DAILY_SHARE_BOOST_CREDITS = 3;

export function resolveListingShareUrl(payload: ListingSharePayload): string {
  if (payload.url) {
    if (payload.url.startsWith('http')) return payload.url;
    if (typeof window !== 'undefined') {
      return new URL(payload.url, window.location.origin).toString();
    }
    return payload.url;
  }
  if (typeof window !== 'undefined') return window.location.href;
  return '';
}
