import { formatPrice, pseudoRandomMetric } from '@/components/public/listing-cards/format-helpers';
import type { PublicDirectoryListingDetail } from '@/lib/public-listings-client';

export function professionalDisplayName(listing: PublicDirectoryListingDetail): string {
  return listing.title.trim() || listing.seller?.displayName?.trim() || 'Profesionist';
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
  // 5-star scale: 4.0 – 5.0
  const tenths = pseudoRandomMetric(`pro-rating:${listing.id}`, 40, 11);
  const rating = Math.min(5, tenths / 10).toFixed(1);
  const reviews = pseudoRandomMetric(`pro-reviews:${listing.id}`, 12, 180);
  return { rating, reviews };
}

export function professionalResponseTime(listing: PublicDirectoryListingDetail): string {
  const hours = pseudoRandomMetric(`pro-response:${listing.id}`, 1, 4);
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

const PORTFOLIO_TITLE_SEEDS = [
  'Vila Horizon',
  'Projekt Urban',
  'Shtëpi Moderne',
  'Renovim Premium',
  'Loft Industrial',
  'Apartament Panorama',
  'Zyrë Kreative',
  'Ambient Minimal',
] as const;

export function professionalCoverImageUrls(listing: PublicDirectoryListingDetail): string[] {
  const images = listing.imageUrls.filter(Boolean);
  if (images.length > 0) return [images[0]!];
  if (listing.imageUrl) return [listing.imageUrl];
  return [];
}

export function professionalPortfolioItems(listing: PublicDirectoryListingDetail): ProfessionalPortfolioItem[] {
  const images = listing.imageUrls.filter(Boolean).slice(1);
  if (images.length === 0) return [];

  const location = listing.cityName ? `${listing.cityName}, Shqipëri` : null;
  return images.slice(0, 8).map((imageUrl, index) => {
    const seedIndex = pseudoRandomMetric(`pro-port-title:${listing.id}:${index}`, 0, PORTFOLIO_TITLE_SEEDS.length - 1);
    return {
      id: `${listing.id}-port-${index}`,
      title: PORTFOLIO_TITLE_SEEDS[seedIndex] ?? `Projekti ${index + 1}`,
      location,
      imageUrl,
    };
  });
}

export type ProfessionalReview = {
  id: string;
  author: string;
  rating: number;
  dateLabel: string;
  text: string;
  initials: string;
};

const REVIEW_AUTHORS = ['Ardit M.', 'Elona K.', 'Besnik H.', 'Dorina S.', 'Erion P.'] as const;

const REVIEW_SNIPPETS = [
  'Shërbim shumë profesional dhe komunikim i shkëlqyer gjatë gjithë projektit.',
  'Rezultati final tejkaloi pritshmëritë tona. E rekomandoj pa hezitim.',
  'Punon me kujdes, respekton afatet dhe ofron zgjidhje kreative.',
  'Ekspert i vërtetë në fushën e tij — bashkëpunim i këndshëm dhe transparent.',
] as const;

export function professionalReviews(listing: PublicDirectoryListingDetail): ProfessionalReview[] {
  const count = pseudoRandomMetric(`pro-review-count:${listing.id}`, 2, 3);
  const sentences = listing.description
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 24);

  return Array.from({ length: count }, (_, index) => {
    const authorIndex = pseudoRandomMetric(`pro-review-author:${listing.id}:${index}`, 0, REVIEW_AUTHORS.length - 1);
    const author = REVIEW_AUTHORS[authorIndex] ?? 'Klient';
    const daysAgo = pseudoRandomMetric(`pro-review-days:${listing.id}:${index}`, 3, 120);
    const rating = pseudoRandomMetric(`pro-review-stars:${listing.id}:${index}`, 4, 2);
    const text =
      sentences[index] ??
      REVIEW_SNIPPETS[pseudoRandomMetric(`pro-review-snippet:${listing.id}:${index}`, 0, REVIEW_SNIPPETS.length - 1)]!;

    return {
      id: `${listing.id}-review-${index}`,
      author,
      rating,
      dateLabel: daysAgo <= 7 ? `${daysAgo} ditë më parë` : `${Math.floor(daysAgo / 7)} javë më parë`,
      text,
      initials: author
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    };
  });
}

export function professionalAvatarUrl(listing: PublicDirectoryListingDetail): string | null {
  return listing.imageUrls[0] ?? listing.imageUrl ?? null;
}

export function professionalInitials(listing: PublicDirectoryListingDetail): string {
  const name = professionalDisplayName(listing);
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'P'
  );
}
