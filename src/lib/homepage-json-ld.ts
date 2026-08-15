import { brandLogoSrc, config } from '@/config';
import { paths } from '@/paths';
import { HOME_VERTICALS } from '@/lib/home-categories';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicListingsBundle,
  PublicMarketplaceListing,
  PublicRealEstateListing,
} from '@/lib/public-listings-client';

export function homepageStaticJsonLd(siteOrigin: string) {
  return {
    website: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.site.name,
      alternateName: 'Ku Ta Gjej',
      url: siteOrigin,
      description: config.site.description,
      inLanguage: 'sq-AL',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteOrigin}${paths.public.realEstate}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: config.site.name,
      url: siteOrigin,
      logo: `${siteOrigin}${brandLogoSrc}`,
    },
    breadcrumbs: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Ballina',
          item: siteOrigin,
        },
      ],
    },
  };
}

export function homepageItemListJsonLd(bundle: PublicListingsBundle, siteOrigin: string) {
  return HOME_VERTICALS.map((v) => {
    const items = (() => {
      switch (v.id) {
        case 'real-estate':
          return bundle.realEstate.map((l) => realEstateItem(l));
        case 'cars':
          return bundle.cars.map((l) => carItem(l));
        case 'jobs':
          return bundle.jobs.map((l) => jobItem(l));
        case 'marketplace':
          return bundle.marketplace.map((l) => marketplaceItem(l));
        case 'businesses':
          return bundle.businesses.map((l) => directoryItem(l));
        case 'professionals':
          return bundle.professionals.map((l) => directoryItem(l));
        default:
          return [];
      }
    })();
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: v.label,
      description: v.tagline,
      url: `${siteOrigin}${v.href}`,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        ...item,
      })),
    };
  });
}

function realEstateItem(l: PublicRealEstateListing) {
  return {
    item: {
      '@type': 'Accommodation',
      name: l.title,
      description: l.description,
      image: l.imageUrl ?? undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: l.cityName ?? undefined,
        addressRegion: l.zoneName ?? undefined,
        addressCountry: 'AL',
      },
      floorSize: l.surfaceM2 ? { '@type': 'QuantitativeValue', value: l.surfaceM2, unitCode: 'MTK' } : undefined,
      numberOfBedrooms: l.bedrooms ?? undefined,
      numberOfBathroomsTotal: l.bathrooms ?? undefined,
      offers: {
        '@type': 'Offer',
        price: l.price,
        priceCurrency: l.currency,
        availability: 'https://schema.org/InStock',
      },
    },
  };
}

function carItem(l: PublicCarListing) {
  return {
    item: {
      '@type': 'Car',
      name: [l.make, l.model, l.variant].filter(Boolean).join(' '),
      description: l.description,
      image: l.imageUrl ?? undefined,
      brand: { '@type': 'Brand', name: l.make },
      model: l.model,
      vehicleModelDate: l.year,
      mileageFromOdometer: { '@type': 'QuantitativeValue', value: l.kilometers, unitCode: 'KMT' },
      fuelType: l.fuelType,
      vehicleTransmission: l.transmission,
      color: l.color,
      offers: {
        '@type': 'Offer',
        price: l.price,
        priceCurrency: l.currency,
        availability: 'https://schema.org/InStock',
        areaServed: l.cityName ?? 'AL',
      },
    },
  };
}

function jobItem(l: PublicJobListing) {
  return {
    item: {
      '@type': 'JobPosting',
      title: l.title,
      description: l.description,
      datePosted: l.createdAt,
      employmentType: l.jobType,
      industry: l.industry,
      jobLocationType: l.workLocation,
      hiringOrganization: { '@type': 'Organization', name: config.site.name },
      jobLocation: l.cityName
        ? {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: l.cityName,
              addressCountry: 'AL',
            },
          }
        : undefined,
      baseSalary:
        l.salary != null
          ? {
              '@type': 'MonetaryAmount',
              currency: l.currency ?? 'EUR',
              value: { '@type': 'QuantitativeValue', value: l.salary, unitText: 'MONTH' },
            }
          : undefined,
    },
  };
}

function marketplaceItem(l: PublicMarketplaceListing) {
  return {
    item: {
      '@type': 'Product',
      name: l.title,
      description: l.description,
      image: l.imageUrl ?? undefined,
      category: l.category,
      offers:
        l.price != null
          ? {
              '@type': 'Offer',
              price: l.price,
              priceCurrency: l.currency ?? 'EUR',
              availability: 'https://schema.org/InStock',
              areaServed: l.cityName ?? 'AL',
            }
          : undefined,
    },
  };
}

function directoryItem(l: PublicDirectoryListing) {
  if (l.kind === 'businesses') {
    return {
      item: {
        '@type': 'Restaurant',
        name: l.title,
        description: l.description,
        image: l.imageUrl ?? undefined,
        address: l.cityName
          ? {
              '@type': 'PostalAddress',
              addressLocality: l.cityName,
              addressCountry: 'AL',
            }
          : undefined,
        telephone: l.contactPhone ?? undefined,
        openingHours: l.openingHours ?? undefined,
        servesCuisine: l.servicesHighlight ?? undefined,
      },
    };
  }
  return {
    item: {
      '@type': 'ProfessionalService',
      name: l.title,
      description: l.description,
      image: l.imageUrl ?? undefined,
      address: l.cityName
        ? {
            '@type': 'PostalAddress',
            addressLocality: l.cityName,
            addressCountry: 'AL',
          }
        : undefined,
      priceRange: l.price != null ? `${l.price} ${l.currency === 'LEK' ? 'ALL' : (l.currency ?? 'EUR')}` : undefined,
    },
  };
}
