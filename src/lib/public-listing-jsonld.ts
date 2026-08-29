import type {
  AnyPublicListingDetail,
  PublicCarListingDetail,
  PublicDirectoryListingDetail,
  PublicJobListingDetail,
  PublicMarketplaceListingDetail,
} from '@/lib/public-listings-client';

type JsonLdObject = Record<string, unknown>;

function absoluteImages(listing: AnyPublicListingDetail): string[] {
  return (listing.imageUrls || []).map((value) => String(value || '').trim()).filter(Boolean);
}

function locationObject(listing: AnyPublicListingDetail): JsonLdObject | undefined {
  const locality = 'cityName' in listing ? listing.cityName : null;
  if (!locality) return undefined;
  return {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: locality,
      addressCountry: 'AL',
    },
  };
}

function breadcrumbFor(listing: AnyPublicListingDetail, canonicalUrl: string): JsonLdObject {
  const vertical =
    listing.kind === 'car'
      ? ['Makina', '/makina']
      : listing.kind === 'job'
        ? ['Punë', '/pune']
        : listing.kind === 'marketplace'
          ? ['Tregu', '/tregu']
          : listing.kind === 'businesses'
            ? ['Biznese', '/biznese']
            : ['Profesionistë', '/profesioniste'];
  const category =
    'propertyCategory' in listing
      ? listing.propertyCategory
      : 'industry' in listing
        ? listing.industry
        : 'category' in listing
          ? listing.category
          : 'make' in listing
            ? `${listing.make} ${listing.model}`
            : null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kryefaqja', item: new URL('/', canonicalUrl).toString() },
      { '@type': 'ListItem', position: 2, name: vertical[0], item: new URL(vertical[1], canonicalUrl).toString() },
      ...(category
        ? [{ '@type': 'ListItem', position: 3, name: String(category) }]
        : []),
      { '@type': 'ListItem', position: category ? 4 : 3, name: listing.title },
    ],
  };
}

function productJsonLd(
  listing: PublicCarListingDetail | PublicMarketplaceListingDetail,
  canonicalUrl: string,
): JsonLdObject {
  const product: JsonLdObject = {
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    url: canonicalUrl,
    image: absoluteImages(listing),
    category:
      listing.kind === 'car'
        ? `${listing.make} ${listing.model}`
        : listing.category,
  };
  if (listing.price != null && Number.isFinite(Number(listing.price))) {
    product.offers = {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: listing.currency || 'EUR',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    };
  }
  return product;
}

function jobJsonLd(listing: PublicJobListingDetail, canonicalUrl: string): JsonLdObject {
  return {
    '@type': 'JobPosting',
    title: listing.title,
    description: listing.description,
    datePosted: listing.createdAt,
    validThrough: listing.expiresAt,
    employmentType: listing.jobType,
    hiringOrganization: listing.seller?.displayName
      ? { '@type': 'Organization', name: listing.seller.displayName }
      : { '@type': 'Organization', name: 'KuTaGjej' },
    jobLocation: locationObject(listing),
    url: canonicalUrl,
    ...(listing.salary != null
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: listing.currency || 'EUR',
            value: { '@type': 'QuantitativeValue', value: listing.salary },
          },
        }
      : {}),
  };
}

function directoryJsonLd(listing: PublicDirectoryListingDetail, canonicalUrl: string): JsonLdObject {
  return {
    '@type': listing.kind === 'businesses' ? 'LocalBusiness' : 'ProfessionalService',
    name: listing.title,
    description: listing.description,
    url: canonicalUrl,
    image: absoluteImages(listing),
    address: locationObject(listing)?.address,
    ...(listing.contactPhone ? { telephone: listing.contactPhone } : {}),
    ...(listing.category ? { category: listing.category } : {}),
  };
}

export function publicListingJsonLd(listing: AnyPublicListingDetail, canonicalUrl: string): JsonLdObject {
  let entity: JsonLdObject;
  if (listing.kind === 'job') entity = jobJsonLd(listing, canonicalUrl);
  else if (listing.kind === 'businesses' || listing.kind === 'professionals') {
    entity = directoryJsonLd(listing, canonicalUrl);
  } else if (listing.kind === 'car' || listing.kind === 'marketplace') {
    entity = productJsonLd(listing, canonicalUrl);
  } else {
    entity = directoryJsonLd(listing, canonicalUrl);
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbFor(listing, canonicalUrl), entity],
  };
}
