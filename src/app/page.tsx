import * as React from 'react';
import type { Metadata } from 'next';
import { HeroSection } from '@/components/public/hero-section';
import { HomepageBanner } from '@/components/public/homepage-banner';
import { PublicShell } from '@/components/public/public-shell';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection } from '@/components/public/listings-section';
import { SeoIntroSection } from '@/components/public/seo-intro-section';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { config } from '@/config';
import { HOME_VERTICALS } from '@/lib/home-categories';
import { fetchHomeBanners } from '@/lib/home-banners-client';
import {
  fetchHomepageListings,
  type PublicCarListing,
  type PublicDirectoryListing,
  type PublicJobListing,
  type PublicMarketplaceListing,
  type PublicRealEstateListing,
} from '@/lib/public-listings-client';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: `${config.site.name} — Njoftime falas: prona, makina, punë dhe tregu në Shqipëri`,
  description:
    'KuTaGjej, platforma shqiptare e njoftimeve. Shfleto apartamente me qira e shitje, vetura të reja dhe të përdorura, oferta pune në Tiranë, Durrës e gjithë Shqipërinë, dhe tregun online — ose posto njoftim falas në sekonda.',
  keywords: [
    'KuTaGjej',
    'njoftime Shqipëri',
    'prona Shqipëri',
    'apartamente me qira Tiranë',
    'apartamente me qira Durrës',
    'shitje shtëpie Tiranë',
    'shitje vile Shqipëri',
    'makina për shitje',
    'makina të përdorura Shqipëri',
    'oferta pune Tiranë',
    'punë Shqipëri',
    'tregu online Shqipëri',
    'njoftime falas',
    'kutagjej',
  ],
  alternates: { canonical: paths.home, languages: { 'sq-AL': paths.home } },
  openGraph: {
    type: 'website',
    locale: 'sq_AL',
    url: config.site.url,
    siteName: config.site.name,
    title: `${config.site.name} — Njoftime falas në Shqipëri`,
    description:
      'Posto, kërko dhe gjej në KuTaGjej — prona, makina, vende pune dhe artikuj. Falas dhe shumë i shpejtë.',
    images: [{ url: '/KuTaGjejLogo.png', alt: config.site.name, width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${config.site.name} — Njoftime në një vend`,
    description:
      'Posto, kërko dhe gjej shpejt: prona, makina, punë dhe tregu — të gjitha në KuTaGjej.',
    images: ['/KuTaGjejLogo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'classifieds',
};

const PLACEHOLDER_TOTALS = {
  realEstate: 0,
  cars: 0,
  jobs: 0,
  marketplace: 0,
  businesses: 0,
  professionals: 0,
};

export default async function HomePage() {
  const [bundle, homeBanners] = await Promise.all([fetchHomepageListings(8), fetchHomeBanners()]);
  const totals = bundle.totals ?? PLACEHOLDER_TOTALS;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.site.name,
    alternateName: 'Ku Ta Gjej',
    url: config.site.url,
    description: config.site.description,
    inLanguage: 'sq-AL',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${config.site.url}${paths.public.realEstate}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.site.name,
    url: config.site.url,
    logo: `${config.site.url}/KuTaGjejLogo.png`,
  };

  const breadcrumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ballina',
        item: config.site.url,
      },
    ],
  };

  // Per-section ItemList tells Google what each carousel contains and helps
  // it surface the homepage for keyword searches (e.g. "apartamente Tiranë").
  const itemListLd = HOME_VERTICALS.map((v) => {
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
      url: `${config.site.url}${v.href}`,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        ...item,
      })),
    };
  });

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      {itemListLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}

      <HeroSection
        banners={homeBanners}
        stats={{
          realEstate: totals.realEstate,
          cars: totals.cars,
          jobs: totals.jobs,
        }}
      />

      <ListingsSection
        verticalId="real-estate"
        total={totals.realEstate}
        isEmpty={bundle.realEstate.length === 0}
        titleOverride="Njoftimet e fundit"
        useMuiVerticalIcon
        hideTotal
        hideVerticalIcon
      >
        <ListingsCarousel>
          {bundle.realEstate.map((listing) => (
            <RealEstateCard key={listing.id} listing={listing} />
          ))}
        </ListingsCarousel>
      </ListingsSection>

      <ListingsSection verticalId="cars" total={totals.cars} isEmpty={bundle.cars.length === 0} useMuiVerticalIcon>
        <ListingsCarousel>
          {bundle.cars.map((listing) => (
            <CarCard key={listing.id} listing={listing} />
          ))}
        </ListingsCarousel>
      </ListingsSection>

      <HomepageBanner
        variant="secondary"
        eyebrow="Komuniteti i KuTaGjej"
        title="Mijëra njoftime, çdo ditë — të gjitha në një vend"
        subtitle="Prona, makina, vende pune dhe artikuj për tregun. Bashkohu me përdoruesit që po e ndërtojnë komunitetin më të madh të njoftimeve në Shqipëri."
        primaryAction={{ label: 'Eksploro njoftimet', href: paths.public.realEstate }}
        secondaryAction={{ label: 'Posto falas', href: paths.user.realEstateListing }}
        stats={[
          {
            value:
              totals.realEstate +
              totals.cars +
              totals.jobs +
              totals.marketplace +
              totals.businesses +
              totals.professionals,
            suffix: '+',
            label: 'Njoftime aktive',
          },
          { value: 6, label: 'Kategori kryesore' },
          { value: 12, suffix: '+', label: 'Qytete të mbuluara' },
        ]}
      />

      <ListingsSection verticalId="jobs" total={totals.jobs} isEmpty={bundle.jobs.length === 0} useMuiVerticalIcon>
        <ListingsCarousel>
          {bundle.jobs.map((listing) => (
            <JobCard key={listing.id} listing={listing} />
          ))}
        </ListingsCarousel>
      </ListingsSection>

      <ListingsSection
        verticalId="marketplace"
        total={totals.marketplace}
        isEmpty={bundle.marketplace.length === 0}
        useMuiVerticalIcon
      >
        <ListingsCarousel>
          {bundle.marketplace.map((listing) => (
            <MarketplaceCard key={listing.id} listing={listing} />
          ))}
        </ListingsCarousel>
      </ListingsSection>

      <ListingsSection
        verticalId="businesses"
        total={totals.businesses}
        isEmpty={bundle.businesses.length === 0}
        useMuiVerticalIcon
      >
        <ListingsCarousel>
          {bundle.businesses.map((listing) => (
            <DirectoryListingCard key={listing.id} listing={listing} />
          ))}
        </ListingsCarousel>
      </ListingsSection>

      <ListingsSection
        verticalId="professionals"
        total={totals.professionals}
        isEmpty={bundle.professionals.length === 0}
        useMuiVerticalIcon
      >
        <ListingsCarousel>
          {bundle.professionals.map((listing) => (
            <DirectoryListingCard key={listing.id} listing={listing} />
          ))}
        </ListingsCarousel>
      </ListingsSection>

      <HomepageBanner
        variant="primary"
        eyebrow="Posto në sekonda"
        title="Njoftimi yt — falas, i shpejtë dhe pa kufij"
        subtitle="Ngarko foto, vendos çmim dhe gjej blerës ose punëdhënës në minuta. Pa abonime, pa komisione, vetëm rezultate."
        primaryAction={{ label: 'Posto njoftim falas', href: paths.user.realEstateListing }}
        secondaryAction={{ label: 'Si funksionon', href: paths.public.about }}
        features={[
          { iconKey: 'currency-eur', label: '100% Falas' },
          { iconKey: 'lightning', label: 'Postim në 30 sekonda' },
          { iconKey: 'shield-check', label: 'Pa komisione' },
        ]}
      />

      <SeoIntroSection />
    </PublicShell>
  );
}

// ---------------------------------------------------------------------------
// JSON-LD item builders — one per vertical
// ---------------------------------------------------------------------------

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
      priceRange:
        l.price != null
          ? `${l.price} ${l.currency === 'LEK' ? 'ALL' : l.currency ?? 'EUR'}`
          : undefined,
    },
  };
}

