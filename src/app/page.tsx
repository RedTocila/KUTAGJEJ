import * as React from 'react';
import type { Metadata } from 'next';

import { brandLogoSrc, config } from '@/config';
import { paths } from '@/paths';
import { homepageStaticJsonLd } from '@/lib/homepage-json-ld';
import { HeroSection } from '@/components/public/hero-section';
import { HomepageBanners } from '@/components/public/homepage-banners';
import { HomepageFeed } from '@/components/public/homepage-feed';
import { HomeCarouselsFallback } from '@/components/public/home-carousels-fallback';
import { HomeBannerSkeleton } from '@/components/public/homepage-skeletons';
import { PublicShell } from '@/components/public/public-shell';

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
    images: [{ url: brandLogoSrc, alt: config.site.name, width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${config.site.name} — Njoftime në një vend`,
    description: 'Posto, kërko dhe gjej shpejt: prona, makina, punë dhe tregu — të gjitha në KuTaGjej.',
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

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

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
