import type {
  AnyPublicListingDetail,
  PublicCarListingDetail,
  PublicDirectoryListingDetail,
  PublicJobListingDetail,
  PublicMarketplaceListingDetail,
} from '@/lib/public-listings-client';
import { cityLandingHref } from '@/lib/seo-internal-links';
import type { HomeVerticalId } from '@/lib/home-categories';

type JsonLdObject = Record<string, unknown>;

function absoluteImages(listing: AnyPublicListingDetail): string[] {
  return (listing.imageUrls || []).map((value) => String(value || '').trim()).filter(Boolean);
}

function postalAddress(listing: AnyPublicListingDetail): JsonLdObject | undefined {
  const locality = 'cityName' in listing ? listing.cityName : null;
  if (!locality) return undefined;
  const zone = 'zoneName' in listing ? listing.zoneName : null;
  return {
    '@type': 'PostalAddress',
    addressLocality: locality,
    ...(zone ? { addressRegion: zone } : {}),
    addressCountry: 'AL',
  };
}

function placeFromListing(listing: AnyPublicListingDetail): JsonLdObject | undefined {
  const address = postalAddress(listing);
  if (!address) return undefined;
  const place: JsonLdObject = { '@type': 'Place', address };
  if ('locationLat' in listing && listing.locationLat != null && listing.locationLng != null) {
    place.geo = {
      '@type': 'GeoCoordinates',
      latitude: listing.locationLat,
      longitude: listing.locationLng,
    };
  }
  return place;
}

function verticalMeta(listing: AnyPublicListingDetail): { label: string; href: string; id: HomeVerticalId } {
  if (listing.kind === 'car') return { label: 'Makina', href: '/makina', id: 'cars' };
  if (listing.kind === 'job') return { label: 'Punë', href: '/pune', id: 'jobs' };
  if (listing.kind === 'marketplace') return { label: 'Tregu', href: '/tregu', id: 'marketplace' };
  if (listing.kind === 'businesses') return { label: 'Biznese', href: '/biznese', id: 'businesses' };
  return { label: 'Profesionistë', href: '/profesioniste', id: 'professionals' };
}

function breadcrumbFor(listing: AnyPublicListingDetail, canonicalUrl: string): JsonLdObject {
  const vertical = verticalMeta(listing);
  const origin = new URL(canonicalUrl).origin;
  const cityName = 'cityName' in listing ? listing.cityName : null;
  const cityHref = cityLandingHref(vertical.id, cityName);
  const items: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Kryefaqja', item: `${origin}/` },
    { '@type': 'ListItem', position: 2, name: vertical.label, item: `${origin}${vertical.href}` },
  ];
  if (cityHref && cityName) {
    items.push({ '@type': 'ListItem', position: 3, name: cityName, item: `${origin}${cityHref}` });
  }
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: listing.title,
    item: canonicalUrl,
  });
  return { '@type': 'BreadcrumbList', itemListElement: items };
}

function mapEmploymentType(raw: string | null | undefined): string | string[] | undefined {
  const v = String(raw || '')
    .toLowerCase()
    .trim();
  if (!v) return undefined;
  if (v.includes('full') || v.includes('kohe-te-plote') || v.includes('kohë të plotë') || v === 'full-time') {
    return 'FULL_TIME';
  }
  if (v.includes('part') || v.includes('kohe-te-pjesshme') || v === 'part-time') return 'PART_TIME';
  if (v.includes('contract') || v.includes('kontrata')) return 'CONTRACTOR';
  if (v.includes('intern') || v.includes('praktike') || v.includes('praktikë')) return 'INTERN';
  if (v.includes('temp') || v.includes('sezon')) return 'TEMPORARY';
  if (v.includes('freelance')) return 'CONTRACTOR';
  return raw || undefined;
}

function carJsonLd(listing: PublicCarListingDetail, canonicalUrl: string): JsonLdObject {
  const images = absoluteImages(listing);
  const car: JsonLdObject = {
    '@type': ['Product', 'Car'],
    name: listing.title,
    description: listing.description,
    url: canonicalUrl,
    image: images,
    brand: { '@type': 'Brand', name: listing.make },
    model: listing.model,
    category: `${listing.make} ${listing.model}`,
  };
  if (listing.year) car.vehicleModelDate = String(listing.year);
  if (listing.kilometers != null) {
    car.mileageFromOdometer = {
      '@type': 'QuantitativeValue',
      value: listing.kilometers,
      unitCode: 'KMT',
    };
  }
  if (listing.fuelType) car.fuelType = listing.fuelType;
  if (listing.transmission) {
    car.vehicleTransmission =
      listing.transmission === 'automatic' ? 'AutomaticTransmission' : 'ManualTransmission';
  }
  if (listing.color) car.color = listing.color;
  if (listing.price != null && Number.isFinite(Number(listing.price))) {
    car.offers = {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: listing.currency || 'EUR',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
      itemCondition: 'https://schema.org/UsedCondition',
    };
  }
  return car;
}

function productJsonLd(listing: PublicMarketplaceListingDetail, canonicalUrl: string): JsonLdObject {
  const product: JsonLdObject = {
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    url: canonicalUrl,
    image: absoluteImages(listing),
    category: listing.category,
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
  const employmentType = mapEmploymentType(listing.jobType);
  const job: JsonLdObject = {
    '@type': 'JobPosting',
    title: listing.title,
    description: listing.description,
    datePosted: listing.createdAt,
    ...(listing.expiresAt ? { validThrough: listing.expiresAt } : {}),
    ...(employmentType ? { employmentType } : {}),
    hiringOrganization: listing.seller?.displayName
      ? { '@type': 'Organization', name: listing.seller.displayName }
      : { '@type': 'Organization', name: 'KuTaGjej' },
    jobLocation: placeFromListing(listing),
    url: canonicalUrl,
    industry: listing.industry || undefined,
  };
  if (listing.workLocation === 'remote') {
    job.jobLocationType = 'TELECOMMUTE';
  }
  if (listing.salary != null) {
    job.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: listing.currency || 'EUR',
      value: { '@type': 'QuantitativeValue', value: listing.salary, unitText: 'MONTH' },
    };
  }
  return job;
}

function directoryJsonLd(listing: PublicDirectoryListingDetail, canonicalUrl: string): JsonLdObject {
  return {
    '@type': listing.kind === 'businesses' ? 'LocalBusiness' : 'ProfessionalService',
    name: listing.title,
    description: listing.description,
    url: canonicalUrl,
    image: absoluteImages(listing),
    address: postalAddress(listing),
    ...(listing.contactPhone ? { telephone: listing.contactPhone } : {}),
    ...(listing.category ? { category: listing.category } : {}),
  };
}

export function publicListingJsonLd(listing: AnyPublicListingDetail, canonicalUrl: string): JsonLdObject {
  let entity: JsonLdObject;
  if (listing.kind === 'job') entity = jobJsonLd(listing, canonicalUrl);
  else if (listing.kind === 'businesses' || listing.kind === 'professionals') {
    entity = directoryJsonLd(listing, canonicalUrl);
  } else if (listing.kind === 'car') {
    entity = carJsonLd(listing, canonicalUrl);
  } else if (listing.kind === 'marketplace') {
    entity = productJsonLd(listing, canonicalUrl);
  } else {
    entity = directoryJsonLd(listing as PublicDirectoryListingDetail, canonicalUrl);
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [breadcrumbFor(listing, canonicalUrl), entity],
  };
}
