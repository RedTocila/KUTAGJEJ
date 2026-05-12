import type { VerticalListingSimilarItem } from '@/components/public/vertical-listing-detail-view';
import { findOptionLabel, formatPrice } from '@/components/public/listing-cards/format-helpers';
import { JOB_INDUSTRY_OPTIONS } from '@/lib/job-constants';
import { MARKETPLACE_CATEGORY_OPTIONS } from '@/lib/marketplace-constants';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
} from '@/lib/public-listings-client';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
} from '@/paths';

function carTitle(l: PublicCarListing): string {
  return [l.make, l.model, l.variant].filter(Boolean).join(' ');
}

export function mapCarsToSimilarStrip(listings: PublicCarListing[], excludeId: string): VerticalListingSimilarItem[] {
  return listings
    .filter((l) => l.id !== excludeId)
    .slice(0, 10)
    .map((l) => ({
      id: l.id,
      href: listingCarPublicHref(l),
      thumbUrl: l.imageUrl,
      title: carTitle(l),
      sub: l.cityName ?? '—',
      badge: String(l.year),
      priceLine: formatPrice(l.price, l.currency),
    }));
}

export function mapJobsToSimilarStrip(listings: PublicJobListing[], excludeId: string): VerticalListingSimilarItem[] {
  return listings
    .filter((l) => l.id !== excludeId)
    .slice(0, 10)
    .map((l) => ({
      id: l.id,
      href: listingJobPublicHref(l),
      thumbUrl: l.imageUrl,
      title: l.title,
      sub: findOptionLabel(JOB_INDUSTRY_OPTIONS, l.industry),
      badge: null,
      priceLine: l.salary != null ? `${formatPrice(l.salary, l.currency)} / muaj` : 'Pagë e diskutueshme',
    }));
}

export function mapMarketplaceToSimilarStrip(
  listings: PublicMarketplaceListing[],
  excludeId: string,
): VerticalListingSimilarItem[] {
  return listings
    .filter((l) => l.id !== excludeId)
    .slice(0, 10)
    .map((l) => ({
      id: l.id,
      href: listingMarketplacePublicHref(l),
      thumbUrl: l.imageUrl,
      title: l.title,
      sub: findOptionLabel(MARKETPLACE_CATEGORY_OPTIONS, l.category),
      badge: null,
      priceLine: formatPrice(l.price, l.currency),
    }));
}

export function mapDirectoryToSimilarStrip(
  listings: PublicDirectoryListing[],
  excludeId: string,
  kind: 'businesses' | 'professionals',
): VerticalListingSimilarItem[] {
  const hrefFn = kind === 'businesses' ? listingBusinessPublicHref : listingProfessionalPublicHref;
  return listings
    .filter((l) => l.id !== excludeId)
    .slice(0, 10)
    .map((l) => ({
      id: l.id,
      href: hrefFn(l),
      thumbUrl: l.imageUrl,
      title: l.title,
      sub: l.cityName ?? l.categoryLabel,
      badge: kind === 'businesses' && l.reservationsEnabled ? 'Rezervim' : null,
      priceLine:
        kind === 'professionals' && l.price != null ? formatPrice(l.price, l.currency) : kind === 'professionals' ? 'Tarifë — kontakt' : null,
    }));
}
