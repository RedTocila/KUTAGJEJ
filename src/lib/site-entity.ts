import { brandLogoSrc, brandSocials, config } from '@/config';

/** Shared Organization entity for homepage, about, and GEO / AI citation signals. */
export function organizationJsonLd(siteOrigin: string) {
  const origin = siteOrigin.replace(/\/$/, '');
  const sameAs = brandSocials.map((s) => s.href);
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: config.site.name,
    alternateName: ['Ku Ta Gjej', 'KuTa Gjej', 'kutagjej.al'],
    url: origin,
    logo: {
      '@type': 'ImageObject',
      url: `${origin}${brandLogoSrc}`,
    },
    description: config.site.description,
    email: 'hello@kutagjej.al',
    areaServed: {
      '@type': 'Country',
      name: 'Albania',
      alternateName: 'Shqipëri',
    },
    knowsAbout: [
      'njoftime Shqipëri',
      'prona Tiranë',
      'makina për shitje',
      'oferta pune Shqipëri',
      'tregu online',
      'marketplace Shqipëri',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'hello@kutagjej.al',
      url: `${origin}/kontakt`,
      availableLanguage: ['sq', 'en'],
    },
    sameAs,
  };
}
