import { brandLogoSrc, config } from '@/config';
import { HOME_VERTICALS } from '@/lib/home-categories';
import type { PublicListingsBundle } from '@/lib/public-listings-client';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
  paths,
} from '@/paths';

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

/**
 * Homepage ItemLists point at listing URLs only — no nested Product/Offer/JobPosting.
 * Full product schema on the homepage triggers GSC Merchant listings errors for a
 * classifieds marketplace that cannot satisfy Shopping rich-result requirements.
 * Detail pages keep their own Product / JobPosting / etc. JSON-LD.
 */
export function homepageItemListJsonLd(bundle: PublicListingsBundle, siteOrigin: string) {
  return HOME_VERTICALS.map((v) => {
    const entries = (() => {
      switch (v.id) {
        case 'real-estate':
          return bundle.realEstate.map((l) => ({
            name: l.title,
            path: listingRealEstatePublicHref(l),
          }));
        case 'cars':
          return bundle.cars.map((l) => ({
            name: [l.make, l.model, l.variant].filter(Boolean).join(' '),
            path: listingCarPublicHref(l),
          }));
        case 'jobs':
          return bundle.jobs.map((l) => ({
            name: l.title,
            path: listingJobPublicHref(l),
          }));
        case 'marketplace':
          return bundle.marketplace.map((l) => ({
            name: l.title,
            path: listingMarketplacePublicHref(l),
          }));
        case 'businesses':
          return bundle.businesses.map((l) => ({
            name: l.title,
            path: listingBusinessPublicHref(l),
          }));
        case 'professionals':
          return bundle.professionals.map((l) => ({
            name: l.title,
            path: listingProfessionalPublicHref(l),
          }));
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
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: entry.name,
        url: `${siteOrigin}${entry.path}`,
      })),
    };
  });
}
