import type { Metadata } from 'next';

import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { config } from '@/config';
import type { PublicRealEstateListingDetail } from '@/lib/public-listings-client';
import { seoSlug } from '@/lib/public-seo';
import { brandIconMetadata, listingSocialImages } from '@/lib/public-vertical-listing-metadata';
import { pathsPublicRealEstateListingDetail } from '@/paths';

function metaSnippet(text: string, max = 158): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function residenceAdditionalType(cat: string): string {
  switch (cat) {
    case 'villa':
    case 'part-of-villa':
      return 'https://schema.org/SingleFamilyResidence';
    case 'apartment':
    case 'penthouse-duplex':
    case 'room-studio-attic':
      return 'https://schema.org/Apartment';
    case 'warehouse':
      return 'https://schema.org/Warehouse';
    default:
      return 'https://schema.org/Place';
  }
}

export function buildRealEstateListingMetadata(listing: PublicRealEstateListingDetail): Metadata {
  const path = listing.permalinkPath?.trim()
    ? pathsPublicRealEstateListingDetail(listing.permalinkPath.trim())
    : `/prona/${listing.id}`;
  const canonical = new URL(path.replace(/^\//, ''), config.site.url);
  const loc = [listing.zoneName, listing.cityName, 'Shqipëri'].filter(Boolean).join(', ');
  const desc = listing.description.trim()
    ? metaSnippet(`${listing.description} ${loc}`)
    : metaSnippet(`${listing.title} ${loc}`);

  const title = `${listing.title} — ${formatPrice(listing.price, listing.currency)}`;
  const images = listingSocialImages(listing.imageUrls, listing.imageUrl, listing.title);
  const primaryImage = images[0]?.url;

  return {
    title,
    description: desc,
    robots: { index: true, follow: true },
    alternates: { canonical: path },
    icons: brandIconMetadata(),
    openGraph: {
      type: 'article',
      locale: 'sq_AL',
      url: canonical.toString(),
      title,
      description: desc,
      siteName: config.site.name,
      images,
    },
    twitter: {
      card: primaryImage ? 'summary_large_image' : 'summary',
      title,
      description: desc,
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}

export function realEstateListingJsonLd(listing: PublicRealEstateListingDetail, canonicalHref: string) {
  const origin = config.site.url.replace(/\/$/, '');
  const loc = [listing.zoneName, listing.cityName, 'Shqipëri'].filter(Boolean).join(', ');
  const images =
    listing.imageUrls.length > 0
      ? listing.imageUrls
      : listing.imageUrl
        ? [listing.imageUrl]
        : [];

  const phone = listing.contactPhone?.trim() || listing.seller?.phone?.trim() || '';
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    price: listing.price,
    priceCurrency: listing.currency,
    availability: 'https://schema.org/InStock',
    url: canonicalHref,
  };

  const tel = phone && phoneDigits(phone);
  if (tel) {
    offer.seller = {
      '@type': listing.seller?.kind === 'business' ? 'LocalBusiness' : 'Person',
      name: listing.seller?.displayName ?? 'KuTaGjej',
      telephone: tel,
    };
  }

  const property: Record<string, unknown> = {
    '@type': 'Product',
    name: listing.title,
    description: listing.description.trim() || `${listing.title} — ${loc}`,
    url: canonicalHref,
    ...(images.length ? { image: images } : {}),
    additionalType: residenceAdditionalType(listing.propertyCategory),
    category: listing.propertyCategory,
    offers: offer,
  };

  if (listing.cityName || listing.zoneName || listing.locationAddress) {
    property.address = {
      '@type': 'PostalAddress',
      addressCountry: 'AL',
      ...(listing.cityName ? { addressLocality: listing.cityName } : {}),
      ...(listing.zoneName ? { addressRegion: listing.zoneName } : {}),
      ...(listing.locationAddress ? { streetAddress: listing.locationAddress } : {}),
    };
  }

  if (listing.locationLat != null && listing.locationLng != null) {
    property.geo = {
      '@type': 'GeoCoordinates',
      latitude: listing.locationLat,
      longitude: listing.locationLng,
    };
  }

  if (listing.surfaceM2) {
    property.floorSize = {
      '@type': 'QuantitativeValue',
      value: listing.surfaceM2,
      unitCode: 'MTK',
    };
  }
  if (listing.bedrooms != null) property.numberOfRooms = listing.bedrooms;
  if (listing.yearBuilt != null) property.yearBuilt = listing.yearBuilt;

  const crumbs: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Kreu', item: `${origin}/` },
    { '@type': 'ListItem', position: 2, name: 'Prona', item: `${origin}/prona` },
  ];
  if (listing.cityName) {
    crumbs.push({
      '@type': 'ListItem',
      position: 3,
      name: listing.cityName,
      item: `${origin}/prona/${encodeURIComponent(seoSlug(listing.cityName))}`,
    });
  }
  crumbs.push({
    '@type': 'ListItem',
    position: crumbs.length + 1,
    name: listing.title,
    item: canonicalHref,
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [{ '@type': 'BreadcrumbList', itemListElement: crumbs }, property],
  };
}

function phoneDigits(raw: string): string | undefined {
  const d = raw.replace(/\D/g, '');
  return d.length >= 8 ? d : undefined;
}
