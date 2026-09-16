'use client';

import * as React from 'react';
import { Container } from '@mui/material';

import { paths } from '@/paths';
import { HOME_SEO_COPY } from '@/lib/public-seo-copy';
import { BrowserSeoSection } from '@/components/public/browser-seo-section';
import { SeoEyebrow, SeoHeadingPanel, SeoTextLinkRow } from '@/components/public/seo-heading-panel';

/**
 * Primary homepage H1 + lead for browsers/crawlers (hidden in native app).
 * Placed at the top of the hero so Google sees a real title above the fold.
 */
export function HomeBrowserHeroSeo() {
  return (
    <BrowserSeoSection aria-labelledby="home-seo-h1" sx={{ pt: { xs: 0.25, md: 0 }, pb: { xs: 0.25, md: 0 } }}>
      <SeoHeadingPanel
        titleId="home-seo-h1"
        title={HOME_SEO_COPY.headline}
        subtext={HOME_SEO_COPY.subtext}
        titleComponent="h1"
        actions={
          <SeoTextLinkRow
            links={[
              { href: paths.public.realEstate, label: 'Prona' },
              { href: paths.public.cars, label: 'Makina' },
              { href: paths.public.jobs, label: 'Punë' },
              { href: paths.public.marketplace, label: 'Tregu' },
            ]}
          />
        }
      />
    </BrowserSeoSection>
  );
}

/** Compact SEO title block used on browse / landing heroes. */
export function BrowseBrowserHeroSeo({
  title,
  subtext,
  titleId,
}: {
  title: string;
  subtext: string;
  titleId: string;
}) {
  return (
    <BrowserSeoSection aria-labelledby={titleId} sx={{ pb: { xs: 1, md: 1.5 } }}>
      <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
        <SeoHeadingPanel titleId={titleId} title={title} subtext={subtext} titleComponent="h1" />
      </Container>
    </BrowserSeoSection>
  );
}

export function BrowseMidPageExplainer({
  heading,
  text,
  links,
}: {
  heading: string;
  text: string;
  links?: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <BrowserSeoSection sx={{ py: { xs: 1.5, md: 2 } }}>
      <Container maxWidth="xl">
        <SeoHeadingPanel
          titleId="browse-mid-seo"
          title={heading}
          subtext={text}
          titleComponent="h2"
          dense
          eyebrow={<SeoEyebrow>Si funksionon</SeoEyebrow>}
          actions={links?.length ? <SeoTextLinkRow links={links} /> : null}
        />
      </Container>
    </BrowserSeoSection>
  );
}
