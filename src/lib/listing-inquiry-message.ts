import {
  type ConversationListingKind,
} from '@/lib/conversations-client';
import { CAR_COLOUR_OPTIONS, FUEL_TYPE_OPTIONS, TRANSMISSION_OPTIONS } from '@/lib/car-constants';
import { findOptionLabel, formatKilometers, formatPrice } from '@/components/public/listing-cards/format-helpers';
import {
  fetchPublicBusinessListingById,
  fetchPublicCarListingById,
  fetchPublicJobListingById,
  fetchPublicMarketplaceListingById,
  fetchPublicProfessionalListingById,
  fetchPublicRealEstateListingById,
} from '@/lib/public-listings-client';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
} from '@/paths';

/** Must stay in sync if server-side detection is added later. */
export const LISTING_INQUIRY_MESSAGE_PREFIX = 'LISTING_INQUIRY';

export type ListingInquiryCardData = {
  v: 1;
  listingKind: ConversationListingKind;
  listingId: string;
  title: string;
  subtitle?: string;
  imageUrl: string | null;
  priceLabel?: string;
  specs: string[];
  location?: string;
  url: string;
};

export function listingInquiryIntro(title: string): string {
  return `Përshëndetje, jam i interesuar për: «${title}».`;
}

export function formatListingInquiryMessage(data: ListingInquiryCardData, intro: string): string {
  const text = intro.trim() || listingInquiryIntro(data.title);
  return `${LISTING_INQUIRY_MESSAGE_PREFIX}\n${JSON.stringify(data)}\n\n${text}`;
}

export function parseListingInquiryMessage(body: string | null | undefined): {
  data: ListingInquiryCardData;
  intro: string;
} | null {
  const raw = String(body || '');
  if (!raw.trimStart().startsWith(LISTING_INQUIRY_MESSAGE_PREFIX)) return null;
  const rest = raw.trimStart().slice(LISTING_INQUIRY_MESSAGE_PREFIX.length).trimStart();
  const newline = rest.indexOf('\n');
  if (newline < 0) return null;
  const jsonLine = rest.slice(0, newline).trim();
  const intro = rest.slice(newline).trim();
  try {
    const parsed = JSON.parse(jsonLine) as Partial<ListingInquiryCardData>;
    if (!parsed || parsed.v !== 1 || !parsed.listingKind || !parsed.listingId || !parsed.title) {
      return null;
    }
    return {
      data: {
        v: 1,
        listingKind: parsed.listingKind as ConversationListingKind,
        listingId: String(parsed.listingId),
        title: String(parsed.title),
        subtitle: parsed.subtitle ? String(parsed.subtitle) : undefined,
        imageUrl: parsed.imageUrl ? String(parsed.imageUrl) : null,
        priceLabel: parsed.priceLabel ? String(parsed.priceLabel) : undefined,
        specs: Array.isArray(parsed.specs) ? parsed.specs.map(String).filter(Boolean) : [],
        location: parsed.location ? String(parsed.location) : undefined,
        url: parsed.url ? String(parsed.url) : '',
      },
      intro,
    };
  } catch {
    return null;
  }
}

export function listingInquiryPreviewText(body: string | null | undefined): string | null {
  const parsed = parseListingInquiryMessage(body);
  return parsed?.intro?.trim() || null;
}

export function encodeListingInquiryParam(listingKind: ConversationListingKind, listingId: string): string {
  return `${listingKind}:${listingId}`;
}

export function decodeListingInquiryParam(raw: string | null | undefined): {
  listingKind: ConversationListingKind;
  listingId: string;
} | null {
  const value = String(raw || '').trim();
  const sep = value.indexOf(':');
  if (sep <= 0) return null;
  const listingKind = value.slice(0, sep).trim() as ConversationListingKind;
  const listingId = value.slice(sep + 1).trim();
  if (!listingId) return null;
  return { listingKind, listingId };
}

export async function fetchListingInquiryDraft(
  listingKind: ConversationListingKind,
  listingId: string,
): Promise<ListingInquiryCardData | null> {
  switch (listingKind) {
    case 'cars': {
      const listing = await fetchPublicCarListingById(listingId);
      if (!listing) return null;
      const title = [listing.make, listing.model, listing.variant].filter(Boolean).join(' ');
      return {
        v: 1,
        listingKind,
        listingId,
        title,
        subtitle: listing.make,
        imageUrl: listing.imageUrl || null,
        priceLabel: formatPrice(listing.price, listing.currency),
        specs: [
          listing.year != null ? String(listing.year) : '',
          listing.kilometers != null ? formatKilometers(listing.kilometers) : '',
          findOptionLabel(FUEL_TYPE_OPTIONS, listing.fuelType),
          findOptionLabel(TRANSMISSION_OPTIONS, listing.transmission),
          listing.color ? findOptionLabel(CAR_COLOUR_OPTIONS, listing.color) : '',
        ].filter(Boolean),
        location: listing.cityName || undefined,
        url: listingCarPublicHref(listing),
      };
    }
    case 'real-estate': {
      const listing = await fetchPublicRealEstateListingById(listingId);
      if (!listing) return null;
      const title = listing.title?.trim() || 'Pronë';
      return {
        v: 1,
        listingKind,
        listingId,
        title,
        subtitle: listing.propertyCategory || undefined,
        imageUrl: listing.imageUrl || null,
        priceLabel: formatPrice(listing.price, listing.currency),
        specs: [
          listing.surfaceM2 ? `${listing.surfaceM2} m²` : '',
          listing.bedrooms ? `${listing.bedrooms} dhoma` : '',
          listing.bathrooms ? `${listing.bathrooms} banjo` : '',
        ].filter(Boolean),
        location: listing.cityName || undefined,
        url: listingRealEstatePublicHref(listing),
      };
    }
    case 'jobs': {
      const listing = await fetchPublicJobListingById(listingId);
      if (!listing) return null;
      const title = listing.title?.trim() || 'Punë';
      return {
        v: 1,
        listingKind,
        listingId,
        title,
        subtitle: listing.industry || undefined,
        imageUrl: listing.imageUrl || null,
        priceLabel: listing.salary != null ? formatPrice(listing.salary, listing.currency) : undefined,
        specs: [listing.jobType, listing.cityName].filter(Boolean) as string[],
        location: listing.cityName || undefined,
        url: listingJobPublicHref(listing),
      };
    }
    case 'marketplace': {
      const listing = await fetchPublicMarketplaceListingById(listingId);
      if (!listing) return null;
      const title = listing.title?.trim() || 'Produkt';
      return {
        v: 1,
        listingKind,
        listingId,
        title,
        subtitle: listing.category || undefined,
        imageUrl: listing.imageUrl || null,
        priceLabel: formatPrice(listing.price, listing.currency),
        specs: [listing.condition, listing.cityName].filter(Boolean) as string[],
        location: listing.cityName || undefined,
        url: listingMarketplacePublicHref(listing),
      };
    }
    case 'businesses': {
      const listing = await fetchPublicBusinessListingById(listingId);
      if (!listing) return null;
      const title = listing.title?.trim() || 'Biznes';
      return {
        v: 1,
        listingKind,
        listingId,
        title,
        subtitle: listing.category || undefined,
        imageUrl: listing.imageUrl || null,
        priceLabel: undefined,
        specs: [listing.category, listing.cityName].filter(Boolean) as string[],
        location: listing.cityName || undefined,
        url: listingBusinessPublicHref(listing),
      };
    }
    case 'professionals': {
      const listing = await fetchPublicProfessionalListingById(listingId);
      if (!listing) return null;
      const title = listing.title?.trim() || 'Profesionist';
      return {
        v: 1,
        listingKind,
        listingId,
        title,
        subtitle: listing.category || undefined,
        imageUrl: listing.imageUrl || null,
        priceLabel: undefined,
        specs: [listing.category, listing.cityName].filter(Boolean) as string[],
        location: listing.cityName || undefined,
        url: listingProfessionalPublicHref(listing),
      };
    }
    default:
      return null;
  }
}
