'use client';

import * as React from 'react';

import { config } from '@/config';
import { HOME_VERTICALS, isHomeVerticalId, type HomeVerticalId } from '@/lib/home-categories';
import { faqJsonLd, VERTICAL_SEO_COPY } from '@/lib/public-seo-copy';
import type { BrowseCategoryId } from '@/components/public/category-hero';
import { PublicSeoContentBlock } from '@/components/public/public-seo-content';

/** Long-form SEO + FAQ under browse grids — hidden in the native app. */
export function VerticalBrowseSeo({ verticalId }: { verticalId: BrowseCategoryId }) {
  if (!isHomeVerticalId(verticalId)) return null;
  const copy = VERTICAL_SEO_COPY[verticalId as HomeVerticalId];
  const href = HOME_VERTICALS.find((v) => v.id === verticalId)?.href || '/';
  const pageUrl = new URL(href.replace(/^\//, ''), config.site.url).toString();
  const jsonLd = JSON.stringify(faqJsonLd(copy.faqs, pageUrl)).replace(/</g, '\\u003c');

  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PublicSeoContentBlock
        headline={copy.headline}
        subtext={copy.subtext}
        paragraphs={copy.paragraphs}
        faqs={copy.faqs}
        headingId={`seo-${verticalId}`}
        faqHeadingId={`faq-${verticalId}`}
      />
    </>
  );
}
