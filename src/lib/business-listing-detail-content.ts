import type { PublicDirectoryListingDetail } from '@/lib/public-listings-client';

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
  return { rating: Number.isFinite(avg) ? avg.toFixed(1) : null, reviews };
}

export function businessOpenStatusLine(listing: PublicDirectoryListingDetail): string | null {
  if (listing.openStatusLine?.trim()) return listing.openStatusLine.trim();
  if (!listing.openingHours?.trim()) return null;
  const ranges = [...listing.openingHours.matchAll(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g)];
  const last = ranges.at(-1);
  if (last?.[2]) return `Hapur • Mbyllet ${last[2]}`;
  return 'Hapur';
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

export function reservationDateOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const dayMonth = d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
    if (i === 0) out.push({ value, label: `Sot · ${dayMonth}` });
    else if (i === 1) out.push({ value, label: `Nesër · ${dayMonth}` });
    else {
      const weekday = d.toLocaleDateString('sq-AL', { weekday: 'short' });
      out.push({ value, label: `${weekday} · ${dayMonth}` });
    }
  }
  return out;
}
