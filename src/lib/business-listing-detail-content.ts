import { pseudoRandomMetric } from '@/components/public/listing-cards/format-helpers';
import type { PublicDirectoryListingDetail } from '@/lib/public-listings-client';

export type BusinessMenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
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
  rating: string;
  reviews: number;
} {
  const tenths = pseudoRandomMetric(`biz-rating:${listing.id}`, 42, 9);
  const rating = (4.2 + tenths / 10).toFixed(1);
  const reviews = pseudoRandomMetric(`biz-reviews:${listing.id}`, 48, 900);
  return { rating, reviews };
}

/** Compact status for detail header — e.g. "Hapur • Mbyllet 24:00". */
export function businessOpenStatusLine(openingHours: string | null): string | null {
  if (!openingHours?.trim()) return null;
  const ranges = [...openingHours.matchAll(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/g)];
  const last = ranges.at(-1);
  if (last?.[2]) return `Hapur • Mbyllet ${last[2]}`;
  return 'Hapur';
}

export function businessMenuCategories(listing: PublicDirectoryListingDetail): string[] {
  const recommended = 'Të rekomanduara';
  if (listing.servicesHighlight) {
    const fromServices = listing.servicesHighlight
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    return [recommended, ...fromServices];
  }
  const byCategory: Record<string, string[]> = {
    restorant: [recommended, 'Antipasta', 'Pjata kryesore', 'Ëmbëlsira'],
    bar: [recommended, 'Kokteje', 'Birra & verë', 'Snacks'],
    kafe: [recommended, 'Kafe', 'Çaj & pije', 'Ëmbëlsira'],
  };
  return byCategory[listing.category] ?? [recommended, 'Menu', 'Pije'];
}

function sentenceToDishName(sentence: string): string {
  const chunk = sentence.split(/[,;–—]/)[0]?.trim() ?? sentence;
  const words = chunk.split(/\s+/).slice(0, 5).join(' ');
  return words.length > 42 ? `${words.slice(0, 39)}…` : words;
}

/** Menu rows derived from listing copy until a dedicated menu API exists. */
export function businessMenuItems(
  listing: PublicDirectoryListingDetail,
  _activeCategory: string,
): BusinessMenuItem[] {
  const sentences = listing.description
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const fallback = [
    listing.servicesHighlight,
    listing.description,
  ]
    .filter(Boolean)
    .flatMap((block) =>
      String(block)
        .split('·')
        .map((s) => s.trim())
        .filter((s) => s.length > 4),
    );

  const lines = sentences.length > 0 ? sentences : fallback;
  const images = listing.imageUrls.length > 0 ? listing.imageUrls : listing.imageUrl ? [listing.imageUrl] : [];
  const priceSeeds = [1200, 850, 1450, 950, 1100, 780];

  return lines.slice(0, 6).map((line, index) => ({
    id: `${listing.id}-menu-${index}`,
    name: sentenceToDishName(line),
    description: line,
    price: priceSeeds[index % priceSeeds.length]!,
    imageUrl: images[index % Math.max(images.length, 1)] ?? null,
  }));
}

export function businessGalleryThumbs(imageUrls: string[], maxVisible = 4): {
  visible: string[];
  extraCount: number;
} {
  const urls = imageUrls.filter(Boolean);
  if (urls.length <= maxVisible) {
    return { visible: urls, extraCount: 0 };
  }
  return {
    visible: urls.slice(0, maxVisible - 1),
    extraCount: urls.length - (maxVisible - 1),
  };
}
