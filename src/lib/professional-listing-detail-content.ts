import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { formatRatingDisplay } from '@/lib/format-rating';
import type { PublicDirectoryListingDetail } from '@/lib/public-listings-client';

export function professionalDisplayName(listing: PublicDirectoryListingDetail): string {
  const title = listing.title?.trim();
  if (title) return title;
  const seller = listing.seller?.displayName?.trim();
  if (seller) return seller;
  return listing.categoryLabel?.trim() || 'Profesionist';
}

export function professionalSubtitle(listing: PublicDirectoryListingDetail): string {
  if (listing.servicesHighlight?.trim()) {
    const first = listing.servicesHighlight.split('·')[0]?.trim();
    if (first && first.length > 4) return first;
  }
  return listing.categoryLabel;
}

export function professionalRatingDisplay(listing: PublicDirectoryListingDetail): {
  rating: string;
  reviews: number;
} {
  const reviews = listing.reviewCount ?? 0;
  const avg = listing.ratingAverage != null ? Number(listing.ratingAverage) : null;
  if (reviews > 0 && avg != null && Number.isFinite(avg)) {
    return { rating: formatRatingDisplay(avg), reviews };
  }
  return { rating: formatRatingDisplay(0), reviews };
}

export function professionalResponseTime(listing: PublicDirectoryListingDetail): string | null {
  const hours = listing.responseTimeHours;
  if (hours == null || !Number.isInteger(hours) || hours < 1) return null;
  return `Brenda ${hours} ${hours === 1 ? 'ore' : 'orësh'}`;
}

export function professionalPriceFromLine(listing: PublicDirectoryListingDetail): string {
  if (listing.price != null && listing.currency) {
    return formatPrice(listing.price, listing.currency);
  }
  return 'Kontakt';
}

export function professionalServiceTags(listing: PublicDirectoryListingDetail): string[] {
  const fromHighlight = listing.servicesHighlight
    ? listing.servicesHighlight
        .split(/[·,;|]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2)
    : [];
  const tags = new Set<string>([listing.categoryLabel, ...fromHighlight]);
  return [...tags].slice(0, 8);
}

export type ProfessionalPortfolioItem = {
  id: string;
  title: string;
  location: string | null;
  imageUrl: string;
};

export function professionalCoverImageUrls(listing: PublicDirectoryListingDetail): string[] {
  const images = listing.imageUrls.filter(Boolean);
  // Convention: [0] = cover, [1] = profile avatar
  if (images.length > 0) return [images[0]!];
  if (listing.imageUrl) return [listing.imageUrl];
  const firstPortfolio = listing.portfolioItems?.[0]?.imageUrl;
  if (firstPortfolio) return [firstPortfolio];
  return [];
}

export function professionalPortfolioItems(listing: PublicDirectoryListingDetail): ProfessionalPortfolioItem[] {
  const items = listing.portfolioItems ?? [];
  if (items.length > 0) {
    return [...items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((item) => Boolean(String(item.imageUrl || '').trim()))
      .map((item) => ({
        id: item.id,
        title: item.title?.trim() || 'Punë',
        location: item.location ?? (listing.cityName ? `${listing.cityName}, Shqipëri` : null),
        imageUrl: item.imageUrl,
      }));
  }

  // Legacy: gallery photos beyond cover + avatar used to act as works.
  const extras = listing.imageUrls.filter((u) => Boolean(String(u || '').trim())).slice(2);
  return extras.map((imageUrl, index) => ({
    id: `gallery-work-${index}`,
    title: `Punë ${index + 1}`,
    location: listing.cityName ? `${listing.cityName}, Shqipëri` : null,
    imageUrl,
  }));
}

export type ProfessionalReviewView = {
  id: string;
  author: string;
  rating: number;
  dateLabel: string;
  text: string;
  initials: string;
};

function reviewDateLabel(createdAt: string): string {
  const created = new Date(createdAt);
  const diffMs = Date.now() - created.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Sot';
  if (days <= 7) return `${days} ditë më parë`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} javë më parë`;
  return created.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'P'
  );
}

export function mapApiReviewToView(review: {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}): ProfessionalReviewView {
  const author = review.reviewerName?.trim() || 'Klient';
  return {
    id: review.id,
    author,
    rating: review.rating,
    dateLabel: reviewDateLabel(review.createdAt),
    text: review.comment?.trim() || '',
    initials: initialsFromName(author),
  };
}

export function professionalAvatarUrl(listing: PublicDirectoryListingDetail): string | null {
  // Convention: [0] = cover, [1] = profile avatar (falls back to cover).
  const images = listing.imageUrls.filter(Boolean);
  return images[1] ?? images[0] ?? listing.imageUrl ?? listing.portfolioItems?.[0]?.imageUrl ?? null;
}

export function professionalInitials(listing: PublicDirectoryListingDetail): string {
  return initialsFromName(professionalDisplayName(listing));
}
