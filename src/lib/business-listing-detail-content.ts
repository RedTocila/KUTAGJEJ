import { computeOpenStatus } from '@/lib/business-hours';
import type { PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { formatRatingDisplay } from '@/lib/format-rating';

export type BusinessMenuItemView = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'EUR' | 'LEK';
  imageUrl: string | null;
};

export function businessCategorySubtitle(listing: PublicDirectoryListingDetail): string {
  const parts = [listing.categoryLabel];
  if (listing.servicesHighlight) {
    parts.push(
      ...listing.servicesHighlight
        .split('·')
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return parts.join(' • ');
}

export function businessRatingDisplay(listing: PublicDirectoryListingDetail): {
  rating: string | null;
  reviews: number;
} {
  const reviews = listing.reviewCount ?? 0;
  if (reviews === 0 || listing.ratingAverage == null) {
    return { rating: null, reviews: 0 };
  }
  const avg = Number(listing.ratingAverage);
  return { rating: Number.isFinite(avg) ? formatRatingDisplay(avg) : null, reviews };
}

export function businessOpenStatusLine(
  listing: PublicDirectoryListingDetail,
  now = new Date(),
): string | null {
  const { label } = computeOpenStatus(listing.weeklyHours, listing.openingHours, now);
  if (label) return label;
  return listing.openStatusLine?.trim() || null;
}

export function businessMenuCategoryNames(listing: PublicDirectoryListingDetail): string[] {
  const cats = listing.menuCategories ?? [];
  if (cats.length === 0) return [];
  return [...cats].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.name);
}

export function businessMenuItemsForCategory(
  listing: PublicDirectoryListingDetail,
  activeCategoryName: string,
): BusinessMenuItemView[] {
  const cats = listing.menuCategories ?? [];
  const cat = cats.find((c) => c.name === activeCategoryName);
  if (!cat) return [];
  return (listing.menuItems ?? [])
    .filter((item) => item.categoryId === cat.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: item.currency,
      imageUrl: item.imageUrl,
    }));
}

export type BusinessMenuSectionView = {
  id: string;
  name: string;
  sortOrder: number;
  items: BusinessMenuItemView[];
};

/** Categories with their items, sorted. Optionally limit items per category (preview). */
export function businessMenuSections(
  listing: PublicDirectoryListingDetail,
  options?: { maxPerCategory?: number },
): BusinessMenuSectionView[] {
  const cats = [...(listing.menuCategories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const max = options?.maxPerCategory;
  return cats
    .map((cat) => {
      let items = (listing.menuItems ?? [])
        .filter((item) => item.categoryId === cat.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          currency: item.currency,
          imageUrl: item.imageUrl,
        }));
      if (typeof max === 'number' && max >= 0) items = items.slice(0, max);
      return {
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        items,
      };
    })
    .filter((s) => s.items.length > 0);
}

/** Local YYYY-MM-DD (avoids UTC shift from `toISOString`). */
export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Bookable window: today through today + 13 days (14 days total). */
export const RESERVATION_DATE_WINDOW_DAYS = 14;

export function reservationDateBounds(from = new Date()): { min: string; max: string } {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + RESERVATION_DATE_WINDOW_DAYS - 1);
  return { min: toLocalIsoDate(start), max: toLocalIsoDate(end) };
}

export function formatReservationDateLabel(iso: string, today = new Date()): string {
  const d = parseLocalIsoDate(iso);
  if (!d) return iso;
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((d.getTime() - todayStart.getTime()) / 86_400_000);
  const dayMonth = d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
  if (diffDays === 0) return `Sot · ${dayMonth}`;
  if (diffDays === 1) return `Nesër · ${dayMonth}`;
  const weekday = d.toLocaleDateString('sq-AL', { weekday: 'short' });
  return `${weekday} · ${dayMonth}`;
}

export function reservationDateOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < RESERVATION_DATE_WINDOW_DAYS; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const value = toLocalIsoDate(d);
    out.push({ value, label: formatReservationDateLabel(value, today) });
  }
  return out;
}
