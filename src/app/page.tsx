import * as React from 'react';
import type { Metadata } from 'next';

import { brandLogoSrc, config } from '@/config';
import { paths } from '@/paths';
import { homepageStaticJsonLd } from '@/lib/homepage-json-ld';
import { faqJsonLd, HOME_SEO_COPY } from '@/lib/public-seo-copy';
import { HeroSection } from '@/components/public/hero-section';
import { HomepageBanners } from '@/components/public/homepage-banners';
import { HomepageFeed } from '@/components/public/homepage-feed';
import { HomeCarouselsFallback } from '@/components/public/home-carousels-fallback';
import { HomeBannerSkeleton } from '@/components/public/homepage-skeletons';
import { PublicShell } from '@/components/public/public-shell';

/** Public homepage — ISR. Observability labels this route `/index` (RSC: `/index.rsc`). */
export const dynamic = 'force-static';
export const revalidate = 300;

export const metadata: Metadata = {
  title: `${config.site.name} — Gjej Gjithçka në Shqipëri: Biznese, Shërbime, Punë dhe Prona`,
  description:
    'KuTaGjej.al është platforma shqiptare ku mund të gjesh biznese, shërbime profesionale, vende pune, prona për shitje dhe qira, produkte dhe oferta në të gjithë Shqipërinë. Kërko sipas kategorisë, qytetit ose shërbimit dhe gjej shpejt atë që të nevojitet pranë teje.',
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
    title: `${config.site.name} — Gjej Gjithçka në Shqipëri`,
    description:
      'Biznese, shërbime, punë, prona dhe oferta në të gjithë Shqipërinë — kërko dhe gjej shpejt në KuTaGjej.al.',
    images: [{ url: brandLogoSrc, alt: config.site.name, width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${config.site.name} — Gjej Gjithçka në Shqipëri`,
    description: 'Biznese, shërbime, punë dhe prona — të gjitha në KuTaGjej.al.',
    images: [brandLogoSrc],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'classifieds',
};

export default function HomePage() {
  const siteOrigin = config.site.url.replace(/\/$/, '');
  const { website, organization, breadcrumbs } = homepageStaticJsonLd(siteOrigin);
  const faq = faqJsonLd(HOME_SEO_COPY.faqs, `${siteOrigin}/`);

  return (
    <PublicShell keepDesktopHeader>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <HeroSection>
        <React.Suspense fallback={<HomeBannerSkeleton />}>
          <HomepageBanners />
        </React.Suspense>
      </HeroSection>

      <React.Suspense fallback={<HomeCarouselsFallback />}>
        <HomepageFeed />
      </React.Suspense>
    </PublicShell>
  );
}
