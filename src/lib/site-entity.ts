import { brandLogoSrc, config } from '@/config';

/**
 * Optional public social profile URLs for Organization `sameAs`.
 * Set in Vercel / .env when real brand pages exist (not generic facebook.com).
 */
function envSameAs(): string[] {
  const keys = [
    'NEXT_PUBLIC_SOCIAL_FACEBOOK_URL',
    'NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL',
    'NEXT_PUBLIC_SOCIAL_LINKEDIN_URL',
    'NEXT_PUBLIC_SOCIAL_TIKTOK_URL',
    'NEXT_PUBLIC_SOCIAL_YOUTUBE_URL',
  ] as const;
  const out: string[] = [];
  for (const key of keys) {
    const raw = String(process.env[key] || '')
      .trim()
      .replace(/\/$/, '');
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      // Skip generic homepage placeholders that are not brand pages.
      if (/^https?:\/\/(www\.)?(facebook|instagram|linkedin|tiktok|youtube)\.com\/?$/i.test(url.href)) {
        continue;
      }
      out.push(url.href);
    } catch {
      /* ignore invalid */
    }
  }
  return out;
}

/** Shared Organization entity for homepage, about, and GEO / AI citation signals. */
export function organizationJsonLd(siteOrigin: string) {
  const origin = siteOrigin.replace(/\/$/, '');
  const sameAs = envSameAs();
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
    ...(sameAs.length ? { sameAs } : {}),
  };
}
